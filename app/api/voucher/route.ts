// Voucher redemption API
import { NextRequest, NextResponse } from 'next/server';
import { getVoucherByCode, redeemVoucher, createSession } from '@/lib/db';
import { addHotspotUser, hoursToUptime } from '@/lib/mikrotik';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, mac_address, ip_address } = body;

        if (!code) {
            return NextResponse.json(
                { success: false, error: 'Voucher code is required' },
                { status: 400 }
            );
        }

        // Get voucher
        const voucher = getVoucherByCode(code.toUpperCase());
        if (!voucher) {
            return NextResponse.json(
                { success: false, error: 'Invalid voucher code' },
                { status: 404 }
            );
        }

        if (voucher.is_used) {
            return NextResponse.json(
                { success: false, error: 'This voucher has already been used' },
                { status: 400 }
            );
        }

        // Redeem voucher
        const redeemed = redeemVoucher(code.toUpperCase(), mac_address || 'unknown');
        if (!redeemed) {
            return NextResponse.json(
                { success: false, error: 'Failed to redeem voucher' },
                { status: 500 }
            );
        }

        // Create hotspot user
        const username = `FASTNET-V${code.slice(-4)}`;
        const password = Math.random().toString(36).substr(2, 8).toUpperCase();

        await addHotspotUser({
            username,
            password,
            macAddress: mac_address || undefined,
            limitUptime: hoursToUptime(voucher.duration_hours || 24)
        });

        // Create session
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (voucher.duration_hours || 24));

        createSession({
            payment_id: 0, // No payment for vouchers
            mac_address: mac_address || 'unknown',
            ip_address: ip_address || undefined,
            username,
            expires_at: expiresAt.toISOString()
        });

        return NextResponse.json({
            success: true,
            message: 'Voucher redeemed successfully!',
            package_name: voucher.package_name,
            expires_at: expiresAt.toISOString(),
            username,
            password
        });

    } catch (error) {
        console.error('Voucher redemption error:', error);
        return NextResponse.json(
            { success: false, error: 'An error occurred while redeeming voucher' },
            { status: 500 }
        );
    }
}
