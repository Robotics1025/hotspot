import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Providers supported by Pawapay for Uganda
const UGANDA_PROVIDERS = {
    MTN: 'MTN_MOMO_UGA',
    AIRTEL: 'AIRTEL_UGA'
};

export async function POST(request: NextRequest) {
    try {
        const { phone, amount, packageId } = await request.json();

        if (!phone || !amount) {
            return NextResponse.json(
                { success: false, message: 'Phone number and amount are required' },
                { status: 400 }
            );
        }

        // Demo mode check
        const isDemoMode = process.env.DEMO_MODE === 'true';

        if (isDemoMode) {
            // Demo mode: simulate Pawapay response
            const depositId = uuidv4();
            return NextResponse.json({
                success: true,
                depositId,
                status: 'ACCEPTED',
                message: 'Demo mode: Payment initiated successfully',
                data: {
                    depositId,
                    status: 'ACCEPTED',
                    nextStep: 'FINAL_STATUS',
                    created: new Date().toISOString()
                }
            });
        }

        // Production mode: Call actual Pawapay API
        const apiToken = process.env.PAWAPAY_API_TOKEN;
        const baseUrl = process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.io';

        if (!apiToken) {
            return NextResponse.json(
                { success: false, message: 'Pawapay API token not configured' },
                { status: 500 }
            );
        }

        // First, predict the provider from phone number
        const predictResponse = await fetch(`${baseUrl}/v2/predict-provider`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: phone
            })
        });

        if (!predictResponse.ok) {
            const error = await predictResponse.json();
            return NextResponse.json(
                { success: false, message: 'Failed to validate phone number', error },
                { status: predictResponse.status }
            );
        }

        const { provider, phoneNumber, country } = await predictResponse.json();

        // Initiate deposit
        const depositId = uuidv4();
        const depositResponse = await fetch(`${baseUrl}/v2/deposits`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                depositId,
                amount: amount.toString(),
                currency: 'UGX', // Uganda Shillings
                payer: {
                    type: 'MMO', // Mobile Money
                    accountDetails: {
                        phoneNumber,
                        provider
                    }
                },
                metadata: {
                    packageId: packageId?.toString() || 'unknown'
                }
            })
        });

        if (!depositResponse.ok) {
            const error = await depositResponse.json();
            return NextResponse.json(
                { success: false, message: 'Failed to initiate payment', error },
                { status: depositResponse.status }
            );
        }

        const depositData = await depositResponse.json();

        return NextResponse.json({
            success: true,
            depositId: depositData.depositId,
            status: depositData.status,
            message: 'Payment initiated successfully. Please check your phone to approve the payment.',
            data: depositData
        });

    } catch (error) {
        console.error('Pawapay initiate error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: String(error) },
            { status: 500 }
        );
    }
}
