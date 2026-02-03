// API route to initiate payment via PawaPay
import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPackageById } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Detect network from phone number
function detectNetwork(phone: string): 'MTN' | 'AIRTEL' | null {
    const cleaned = phone.replace(/\D/g, '');
    
    // MTN Uganda prefixes: 077, 078, 076, 039
    if (/^(256)?(77|78|76|39)/.test(cleaned) || /^0(77|78|76|39)/.test(cleaned)) {
        return 'MTN';
    }
    
    // Airtel Uganda prefixes: 070, 075, 074
    if (/^(256)?(70|75|74)/.test(cleaned) || /^0(70|75|74)/.test(cleaned)) {
        return 'AIRTEL';
    }
    
    return null;
}

// Format phone number to international format
function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('256')) {
        return cleaned;
    }
    if (cleaned.startsWith('0')) {
        return '256' + cleaned.slice(1);
    }
    return '256' + cleaned;
}

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
        const depositId = uuidv4();
        const formattedPhone = formatPhoneNumber(phone);

        // Create payment record
        const paymentId = await createPayment({
            tx_ref: depositId,
            phone: formattedPhone,
            amount: pkg.price,
            package_id: pkg.id,
            mac_address,
            ip_address
        });

        // Demo mode check
        const isDemoMode = process.env.DEMO_MODE === 'true';

        if (isDemoMode) {
            return NextResponse.json({
                success: true,
                message: 'Demo mode: Payment initiated successfully. Check your phone.',
                tx_ref: depositId,
                payment_id: paymentId,
                network,
                amount: pkg.price,
                package_name: pkg.name
            });
        }

        // Production: Call PawaPay API
        const apiToken = process.env.PAWAPAY_API_TOKEN;
        const baseUrl = process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io';

        if (!apiToken) {
            return NextResponse.json(
                { success: false, error: 'Payment system not configured' },
                { status: 500 }
            );
        }

        // Predict provider from phone
        const predictResponse = await fetch(`${baseUrl}/v2/predict-provider`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phoneNumber: formattedPhone })
        });

        if (!predictResponse.ok) {
            return NextResponse.json(
                { success: false, error: 'Failed to validate phone number' },
                { status: 400 }
            );
        }

        const { provider, phoneNumber } = await predictResponse.json();

        // Initiate deposit
        const depositResponse = await fetch(`${baseUrl}/v2/deposits`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                depositId,
                amount: pkg.price.toString(),
                currency: 'UGX',
                payer: {
                    type: 'MMO',
                    accountDetails: {
                        phoneNumber,
                        provider
                    }
                },
                metadata: {
                    packageId: pkg.id.toString(),
                    macAddress: mac_address || 'unknown'
                }
            })
        });

        const depositResult = await depositResponse.json();

        if (depositResponse.ok && (depositResult.status === 'ACCEPTED' || depositResult.status === 'PENDING')) {
            return NextResponse.json({
                success: true,
                message: 'Payment initiated. Please check your phone for the prompt.',
                tx_ref: depositId,
                payment_id: paymentId,
                network,
                amount: pkg.price,
                package_name: pkg.name
            });
        } else {
            return NextResponse.json(
                { success: false, error: depositResult.message || 'Payment initiation failed' },
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
