// Admin API for voucher management
import { NextRequest, NextResponse } from 'next/server';
import { createVoucher, generateVoucherCode, getPackageById } from '@/lib/db';
import db, { initializeDatabase } from '@/lib/db';

// Get all vouchers
export async function GET() {
    try {
        await initializeDatabase();
        const result = await db.execute(`
            SELECT v.*, p.name as package_name, p.price as package_price
            FROM vouchers v
            LEFT JOIN packages p ON v.package_id = p.id
            ORDER BY v.created_at DESC
            LIMIT 100
        `);

        return NextResponse.json({ success: true, vouchers: result.rows });
    } catch (error) {
        console.error('Error fetching vouchers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch vouchers' },
            { status: 500 }
        );
    }
}

// Generate new vouchers
export async function POST(request: NextRequest) {
    try {
        await initializeDatabase();
        const body = await request.json();
        const { package_id, quantity = 1 } = body;

        if (!package_id) {
            return NextResponse.json(
                { success: false, error: 'Package ID is required' },
                { status: 400 }
            );
        }

        // Verify package exists
        const pkg = await getPackageById(package_id);
        if (!pkg) {
            return NextResponse.json(
                { success: false, error: 'Invalid package' },
                { status: 400 }
            );
        }

        // Limit quantity to prevent abuse
        const qty = Math.min(Math.max(1, quantity), 50);
        
        const generatedVouchers: { code: string; package_name: string; price: number }[] = [];

        for (let i = 0; i < qty; i++) {
            let code = generateVoucherCode();
            
            // Ensure unique code
            let attempts = 0;
            while (attempts < 10) {
                const existing = await db.execute({ sql: 'SELECT id FROM vouchers WHERE code = ?', args: [code] });
                if (existing.rows.length === 0) break;
                code = generateVoucherCode();
                attempts++;
            }

            await createVoucher(code, package_id);
            generatedVouchers.push({
                code,
                package_name: pkg.name,
                price: pkg.price
            });
        }

        return NextResponse.json({
            success: true,
            message: `Generated ${generatedVouchers.length} voucher(s)`,
            vouchers: generatedVouchers
        });
    } catch (error) {
        console.error('Error generating vouchers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate vouchers' },
            { status: 500 }
        );
    }
}

// Delete a voucher
export async function DELETE(request: NextRequest) {
    try {
        await initializeDatabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Voucher ID is required' },
                { status: 400 }
            );
        }

        const result = await db.execute({ sql: 'DELETE FROM vouchers WHERE id = ? AND is_used = 0', args: [id] });

        if (result.rowsAffected === 0) {
            return NextResponse.json(
                { success: false, error: 'Voucher not found or already used' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: 'Voucher deleted' });
    } catch (error) {
        console.error('Error deleting voucher:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete voucher' },
            { status: 500 }
        );
    }
}
