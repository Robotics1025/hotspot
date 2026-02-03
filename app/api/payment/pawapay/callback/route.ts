import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

interface Payment {
    id: number;
    tx_ref: string;
    package_id: number;
    status: string;
    mac_address: string | null;
}

interface Package {
    id: number;
    name: string;
    duration_hours: number;
    price: number;
}

// Pawapay webhook callback handler
export async function POST(request: NextRequest) {
    try {
        await initializeDatabase();
        const body = await request.json();

        console.log('Pawapay webhook received:', JSON.stringify(body, null, 2));

        // Extract deposit information
        const { depositId, status, amount, currency, payer, providerTransactionId } = body;

        if (!depositId) {
            return NextResponse.json(
                { success: false, message: 'Invalid webhook payload' },
                { status: 400 }
            );
        }

        if (status === 'COMPLETED') {
            // Payment successful - update payment record
            await db.execute({
                sql: `UPDATE payments SET status = 'successful', provider_tx_id = ? WHERE tx_ref = ?`,
                args: [providerTransactionId || depositId, depositId]
            });

            // Check if this payment is associated with a package and create session
            const paymentResult = await db.execute({
                sql: `SELECT * FROM payments WHERE tx_ref = ? AND status = 'successful'`,
                args: [depositId]
            });
            const payment = paymentResult.rows[0] as unknown as Payment | undefined;

            if (payment && payment.package_id) {
                const pkgResult = await db.execute({
                    sql: 'SELECT * FROM packages WHERE id = ?',
                    args: [payment.package_id]
                });
                const pkg = pkgResult.rows[0] as unknown as Package | undefined;

                if (pkg) {
                    // Generate username and credentials
                    const username = `user_${Date.now()}`;
                    const password = Math.random().toString(36).slice(-8);
                    const expiresAt = new Date(Date.now() + pkg.duration_hours * 60 * 60 * 1000).toISOString();

                    // Create session
                    await db.execute({
                        sql: `INSERT INTO sessions (username, password, mac_address, expires_at, package_name, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
                        args: [username, password, payer?.accountDetails?.phoneNumber || 'unknown', expiresAt, pkg.name]
                    });

                    console.log(`Session created for payment ${depositId}: ${username}`);
                }
            }
        } else if (status === 'FAILED') {
            // Payment failed - update status
            await db.execute({
                sql: `UPDATE payments SET status = 'failed' WHERE tx_ref = ?`,
                args: [depositId]
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully'
        });

    } catch (error) {
        console.error('Pawapay webhook error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: String(error) },
            { status: 500 }
        );
    }
}
