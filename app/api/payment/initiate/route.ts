// API route to initiate payment
import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPackageById } from '@/lib/db';
import { initiateMobileMoneyPayment, detectNetwork, formatPhoneNumber } from '@/lib/flutterwave';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, package_id, mac_address, ip_address } = body;

        // Validate inputs
        if (!phone || !package_id) {
            return NextResponse.json(
                { success: false, error: 'Phone number and package are required' },
                { status: 400 }
            );
        }

        // Get package details
        const pkg = await getPackageById(package_id);
        if (!pkg) {
            return NextResponse.json(
                { success: false, error: 'Invalid package selected' },
                { status: 400 }
            );
        }

        // Detect network
        const network = detectNetwork(phone);
        if (!network) {
            return NextResponse.json(
                { success: false, error: 'Please use a valid MTN or Airtel Uganda number' },
                { status: 400 }
            );
        }

        // Generate unique transaction reference
        const tx_ref = `FASTNET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create payment record
        const paymentId = await createPayment({
            tx_ref,
            phone: formatPhoneNumber(phone),
            amount: pkg.price,
            package_id: pkg.id,
            mac_address,
            ip_address
        });

        // Initiate mobile money payment
        const response = await initiateMobileMoneyPayment({
            phone,
            amount: pkg.price,
            tx_ref,
            network
        });

        if (response.status === 'success' || response.status === 'pending') {
            return NextResponse.json({
                success: true,
                message: 'Payment initiated. Please check your phone for the prompt.',
                tx_ref,
                payment_id: paymentId,
                network,
                amount: pkg.price,
                package_name: pkg.name
            });
        } else {
            return NextResponse.json(
                { success: false, error: response.message || 'Payment initiation failed' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Payment error:', error);
        return NextResponse.json(
            { success: false, error: 'An error occurred while processing payment' },
            { status: 500 }
        );
    }
}
