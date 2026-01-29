// Flutterwave payment integration for FASTNET
const Flutterwave = require('flutterwave-node-v3');

const flw = new Flutterwave(
    process.env.FLW_PUBLIC_KEY || '',
    process.env.FLW_SECRET_KEY || ''
);

export interface MobileMoneyPayload {
    phone: string;
    amount: number;
    tx_ref: string;
    currency?: string;
    network?: 'MTN' | 'AIRTEL';
    email?: string;
}

export interface FlutterwaveResponse {
    status: string;
    message: string;
    data?: {
        id: number;
        tx_ref: string;
        flw_ref: string;
        status: string;
        amount: number;
        charged_amount: number;
    };
    meta?: {
        authorization?: {
            redirect?: string;
            mode?: string;
        };
    };
}

// Detect network from phone number
export function detectNetwork(phone: string): 'MTN' | 'AIRTEL' | null {
    const cleaned = phone.replace(/\D/g, '');

    // Uganda MTN prefixes: 077, 078, 076
    // Uganda Airtel prefixes: 070, 075, 074

    if (cleaned.startsWith('256')) {
        const prefix = cleaned.substring(3, 5);
        if (['77', '78', '76'].includes(prefix)) return 'MTN';
        if (['70', '75', '74'].includes(prefix)) return 'AIRTEL';
    } else if (cleaned.startsWith('0')) {
        const prefix = cleaned.substring(1, 3);
        if (['77', '78', '76'].includes(prefix)) return 'MTN';
        if (['70', '75', '74'].includes(prefix)) return 'AIRTEL';
    }

    return null;
}

// Format phone number to international format
export function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('256')) {
        return cleaned;
    } else if (cleaned.startsWith('0')) {
        return '256' + cleaned.substring(1);
    }

    return '256' + cleaned;
}

// Initiate Mobile Money payment (STK Push)
export async function initiateMobileMoneyPayment(payload: MobileMoneyPayload): Promise<FlutterwaveResponse> {
    const network = payload.network || detectNetwork(payload.phone);
    const formattedPhone = formatPhoneNumber(payload.phone);

    if (!network) {
        throw new Error('Could not detect mobile network. Please use MTN or Airtel number.');
    }

    // Demo mode for testing
    if (process.env.DEMO_MODE === 'true') {
        return {
            status: 'success',
            message: 'Demo payment initiated',
            data: {
                id: Math.floor(Math.random() * 1000000),
                tx_ref: payload.tx_ref,
                flw_ref: 'FLW-DEMO-' + Date.now(),
                status: 'successful',
                amount: payload.amount,
                charged_amount: payload.amount
            }
        };
    }

    try {
        const response = await flw.MobileMoney.uganda({
            phone_number: formattedPhone,
            amount: payload.amount,
            currency: payload.currency || 'UGX',
            tx_ref: payload.tx_ref,
            email: payload.email || 'customer@fastnet.ug',
            network: network,
            meta: {
                consumer_id: formattedPhone,
                consumer_mac: 'hotspot-payment'
            }
        });

        return response;
    } catch (error) {
        console.error('Flutterwave payment error:', error);
        throw error;
    }
}

// Verify payment status
export async function verifyPayment(transactionId: number): Promise<FlutterwaveResponse> {
    if (process.env.DEMO_MODE === 'true') {
        return {
            status: 'success',
            message: 'Demo payment verified',
            data: {
                id: transactionId,
                tx_ref: 'demo-tx',
                flw_ref: 'FLW-DEMO-' + transactionId,
                status: 'successful',
                amount: 1000,
                charged_amount: 1000
            }
        };
    }

    try {
        const response = await flw.Transaction.verify({ id: transactionId });
        return response;
    } catch (error) {
        console.error('Payment verification error:', error);
        throw error;
    }
}

// Verify by tx_ref
export async function verifyPaymentByTxRef(txRef: string): Promise<FlutterwaveResponse> {
    if (process.env.DEMO_MODE === 'true') {
        return {
            status: 'success',
            message: 'Demo payment verified',
            data: {
                id: Math.floor(Math.random() * 1000000),
                tx_ref: txRef,
                flw_ref: 'FLW-DEMO-' + Date.now(),
                status: 'successful',
                amount: 1000,
                charged_amount: 1000
            }
        };
    }

    try {
        const response = await flw.Transaction.verify_by_txRef({ tx_ref: txRef });
        return response;
    } catch (error) {
        console.error('Payment verification error:', error);
        throw error;
    }
}

export default flw;
