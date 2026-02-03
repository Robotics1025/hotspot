import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const WEBHOOK_SECRET = process.env.FLW_WEBHOOK_SECRET || 'demo-webhook-secret';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${APP_URL}/api/webhook`;

const samplePayload = {
    event: 'charge.completed',
    data: {
        id: 123456,
        tx_ref: 'TEST-TX-' + Date.now(),
        flw_ref: 'FLW-TEST-' + Date.now(),
        device_fingerprint: 'N/A',
        amount: 1000,
        currency: 'UGX',
        charged_amount: 1000,
        app_fee: 10,
        merchant_fee: 0,
        processor_response: 'Approved',
        auth_model: 'MOBILEMONEY',
        ip: '127.0.0.1',
        narrative: 'Broadband Subscription',
        status: 'successful',
        payment_type: 'mobilemoneyug',
        created_at: new Date().toISOString(),
        account_id: 12345,
        customer: {
            id: 999,
            name: 'Test User',
            phone_number: '256770000000',
            email: 'test@example.com',
            created_at: new Date().toISOString()
        }
    }
};

async function testWebhook() {
    console.log('🚀 Sending test webhook to:', WEBHOOK_URL);
    console.log('🔑 Using Secret Hash:', WEBHOOK_SECRET);
    console.log('📦 Payload:', JSON.stringify(samplePayload, null, 2));

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'verif-hash': WEBHOOK_SECRET
            },
            body: JSON.stringify(samplePayload)
        });

        const data = await response.json();
        console.log('\nResponse Status:', response.status);
        console.log('Response Body:', data);

        if (response.status === 200) {
            console.log('\n✅ Webhook delivered successfully!');
        } else {
            console.log('\n❌ Webhook failed.');
        }

    } catch (error) {
        console.error('\n❌ Error sending webhook:', error);
    }
}

testWebhook();
