// API route to check payment status
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentByTxRef, updatePaymentStatus, getPackageById, createSession } from '@/lib/db';
import { verifyPaymentByTxRef } from '@/lib/flutterwave';
import { addHotspotUser, hoursToUptime } from '@/lib/mikrotik';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const tx_ref = searchParams.get('tx_ref');

    if (!tx_ref) {
        return NextResponse.json(
            { success: false, error: 'Transaction reference is required' },
            { status: 400 }
        );
    }

    try {
        // Get payment from database
        const payment = getPaymentByTxRef(tx_ref);
        if (!payment) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        // If already successful, return the status
        if (payment.status === 'successful') {
            const pkg = getPackageById(payment.package_id);
            return NextResponse.json({
                success: true,
                status: 'successful',
                payment: {
                    ...payment,
                    package_name: pkg?.name
                }
            });
        }

        // Verify with Flutterwave
        const verification = await verifyPaymentByTxRef(tx_ref);

        if (verification.status === 'success' && verification.data?.status === 'successful') {
            // Update payment status in database
            updatePaymentStatus(tx_ref, 'successful', verification.data.flw_ref);

            // Get updated payment
            const updatedPayment = getPaymentByTxRef(tx_ref);
            const pkg = getPackageById(payment.package_id);

            if (updatedPayment && pkg) {
                // Create hotspot user
                const username = `FASTNET-${updatedPayment.phone.slice(-4)}`;
                const password = Math.random().toString(36).substr(2, 8).toUpperCase();

                await addHotspotUser({
                    username,
                    password,
                    macAddress: updatedPayment.mac_address || undefined,
                    limitUptime: hoursToUptime(pkg.duration_hours)
                });

                // Create session
                createSession({
                    payment_id: updatedPayment.id,
                    mac_address: updatedPayment.mac_address || 'unknown',
                    ip_address: updatedPayment.ip_address || undefined,
                    username,
                    expires_at: updatedPayment.expires_at || new Date().toISOString()
                });

                return NextResponse.json({
                    success: true,
                    status: 'successful',
                    message: 'Payment confirmed! You are now connected.',
                    payment: {
                        ...updatedPayment,
                        package_name: pkg.name,
                        username,
                        password
                    }
                });
            }
        }

        // Payment still pending or failed
        return NextResponse.json({
            success: true,
            status: payment.status,
            message: payment.status === 'pending'
                ? 'Payment is still being processed. Please complete the payment on your phone.'
                : 'Payment was not successful.'
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check payment status' },
            { status: 500 }
        );
    }
}
