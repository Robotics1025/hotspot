// PawaPay webhook handler
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentByTxRef, updatePaymentStatus, getPackageById, createSession } from '@/lib/db';
import { addHotspotUser, hoursToUptime } from '@/lib/mikrotik';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('PawaPay webhook received:', JSON.stringify(body, null, 2));

        const { depositId, status } = body;

        if (!depositId) {
            return NextResponse.json({ status: 'invalid payload' }, { status: 400 });
        }

        // Get payment record
        const payment = await getPaymentByTxRef(depositId);
        if (!payment) {
            console.error('Payment not found for depositId:', depositId);
            return NextResponse.json({ status: 'payment not found' });
        }

        if (status === 'COMPLETED') {
            // Payment successful
            await updatePaymentStatus(depositId, 'successful', depositId);

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

                console.log(`Payment ${depositId} successful. User ${username} created.`);
            }

            return NextResponse.json({ status: 'success' });
        }

        if (status === 'FAILED') {
            await updatePaymentStatus(depositId, 'failed');
            console.log(`Payment ${depositId} failed.`);
            return NextResponse.json({ status: 'noted' });
        }

        return NextResponse.json({ status: 'received' });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
