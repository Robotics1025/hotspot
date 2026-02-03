import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const depositId = searchParams.get('depositId');

        if (!depositId) {
            return NextResponse.json(
                { success: false, message: 'Deposit ID is required' },
                { status: 400 }
            );
        }

        // Demo mode check
        const isDemoMode = process.env.DEMO_MODE === 'true';

        if (isDemoMode) {
            // Demo mode: simulate completed payment
            return NextResponse.json({
                success: true,
                data: {
                    depositId,
                    status: 'COMPLETED',
                    amount: '1000.00',
                    currency: 'UGX',
                    country: 'UGA',
                    payer: {
                        type: 'MMO',
                        accountDetails: {
                            phoneNumber: '256700000000',
                            provider: 'MTN_MOMO_UGA'
                        }
                    },
                    created: new Date().toISOString(),
                    providerTransactionId: 'demo-' + Date.now()
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

        // Check deposit status
        const response = await fetch(`${baseUrl}/v2/deposits/${depositId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { success: false, message: 'Failed to check payment status', error },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Pawapay status check error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: String(error) },
            { status: 500 }
        );
    }
}
