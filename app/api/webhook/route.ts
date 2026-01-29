// Flutterwave webhook handler
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentByTxRef, updatePaymentStatus, getPackageById, createSession } from '@/lib/db';
import { addHotspotUser, hoursToUptime } from '@/lib/mikrotik';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Verify webhook signature
        const secretHash = process.env.FLW_WEBHOOK_SECRET;
        const signature = request.headers.get('verif-hash');

        if (secretHash && signature !== secretHash) {
            console.error('Invalid webhook signature');
            return NextResponse.json({ status: 'error' }, { status: 401 });
        }

        const { event, data } = body;

        if (event === 'charge.completed' && data.status === 'successful') {
            const tx_ref = data.tx_ref;
            const flw_ref = data.flw_ref;

            // Get payment record
            const payment = getPaymentByTxRef(tx_ref);
            if (!payment) {
                console.error('Payment not found for tx_ref:', tx_ref);
                return NextResponse.json({ status: 'payment not found' });
            }

            // Verify amount matches
            if (payment.amount !== data.amount) {
                console.error('Amount mismatch:', payment.amount, '!==', data.amount);
                return NextResponse.json({ status: 'amount mismatch' });
            }

            // Update payment status
            updatePaymentStatus(tx_ref, 'successful', flw_ref);

            // Get package
            const pkg = getPackageById(payment.package_id);
            if (!pkg) {
                console.error('Package not found:', payment.package_id);
                return NextResponse.json({ status: 'package not found' });
            }

            // Create hotspot user
            const username = `FASTNET-${payment.phone.slice(-4)}`;
            const password = Math.random().toString(36).substr(2, 8).toUpperCase();

            await addHotspotUser({
                username,
                password,
                macAddress: payment.mac_address || undefined,
                limitUptime: hoursToUptime(pkg.duration_hours)
            });

            // Create session
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + pkg.duration_hours);

            createSession({
                payment_id: payment.id,
                mac_address: payment.mac_address || 'unknown',
                ip_address: payment.ip_address || undefined,
                username,
                expires_at: expiresAt.toISOString()
            });

            console.log(`Payment ${tx_ref} successful. User ${username} created.`);
            return NextResponse.json({ status: 'success' });
        }

        if (event === 'charge.completed' && data.status === 'failed') {
            const tx_ref = data.tx_ref;
            updatePaymentStatus(tx_ref, 'failed', data.flw_ref);
            console.log(`Payment ${tx_ref} failed.`);
            return NextResponse.json({ status: 'noted' });
        }

        return NextResponse.json({ status: 'received' });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
