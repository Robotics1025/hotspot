// API route to check payment status via PawaPay
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentByTxRef, updatePaymentStatus, getPackageById, createSession } from '@/lib/db';
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
        const payment = await getPaymentByTxRef(tx_ref);
        if (!payment) {
            return NextResponse.json(
                { success: false, error: 'Payment not found' },
                { status: 404 }
            );
        }

        // If already successful, return the status
        if (payment.status === 'successful') {
            const pkg = await getPackageById(payment.package_id);
            return NextResponse.json({
                success: true,
                status: 'successful',
                payment: {
                    ...payment,
                    package_name: pkg?.name
                }
            });
        }

        // Demo mode - simulate successful payment after a few checks
        const isDemoMode = process.env.DEMO_MODE === 'true';
        
        if (isDemoMode) {
            // In demo mode, mark as successful
            await updatePaymentStatus(tx_ref, 'successful', 'demo-ref');
            
            const pkg = await getPackageById(payment.package_id);
            if (pkg) {
                const username = `FASTNET-${payment.phone.slice(-4)}`;
                const password = Math.random().toString(36).substr(2, 8).toUpperCase();

                await addHotspotUser({
                    username,
                    password,
                    macAddress: payment.mac_address || undefined,
                    limitUptime: hoursToUptime(pkg.duration_hours)
                });

                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + pkg.duration_hours);

                await createSession({
                    payment_id: payment.id,
                    mac_address: payment.mac_address || 'unknown',
                    ip_address: payment.ip_address || undefined,
                    username,
                    expires_at: expiresAt.toISOString()
                });

                return NextResponse.json({
                    success: true,
                    status: 'successful',
                    message: 'Payment confirmed! You are now connected.',
                    payment: {
                        ...payment,
                        package_name: pkg.name,
                        username,
                        password
                    }
                });
            }
        }

        // Production: Check with PawaPay API
        const apiToken = process.env.PAWAPAY_API_TOKEN;
        const baseUrl = process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io';

        if (!apiToken) {
            return NextResponse.json({
                success: true,
                status: payment.status,
                message: 'Payment is still being processed.'
            });
        }

        const statusResponse = await fetch(`${baseUrl}/v2/deposits/${tx_ref}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.status === 'COMPLETED') {
                // Payment successful
                await updatePaymentStatus(tx_ref, 'successful', statusData.depositId);

                const pkg = await getPackageById(payment.package_id);
                if (pkg) {
                    const username = `FASTNET-${payment.phone.slice(-4)}`;
                    const password = Math.random().toString(36).substr(2, 8).toUpperCase();

                    await addHotspotUser({
                        username,
                        password,
                        macAddress: payment.mac_address || undefined,
                        limitUptime: hoursToUptime(pkg.duration_hours)
                    });

                    const expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + pkg.duration_hours);

                    await createSession({
                        payment_id: payment.id,
                        mac_address: payment.mac_address || 'unknown',
                        ip_address: payment.ip_address || undefined,
                        username,
                        expires_at: expiresAt.toISOString()
                    });

                    return NextResponse.json({
                        success: true,
                        status: 'successful',
                        message: 'Payment confirmed! You are now connected.',
                        payment: {
                            ...payment,
                            package_name: pkg.name,
                            username,
                            password
                        }
                    });
                }
            } else if (statusData.status === 'FAILED') {
                await updatePaymentStatus(tx_ref, 'failed');
                return NextResponse.json({
                    success: true,
                    status: 'failed',
                    message: 'Payment was not successful. Please try again.'
                });
            }
        }

        // Payment still pending
        return NextResponse.json({
            success: true,
            status: payment.status,
            message: 'Payment is still being processed. Please complete the payment on your phone.'
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to check payment status' },
            { status: 500 }
        );
    }
}
