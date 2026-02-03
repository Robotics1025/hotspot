import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

// Create new package
export async function POST(req: NextRequest) {
    try {
        await initializeDatabase();
        const body = await req.json();
        const { name, duration_hours, price, description } = body;

        if (!name || !duration_hours || !price) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await db.execute({
            sql: `INSERT INTO packages (name, duration_hours, price, description) VALUES (?, ?, ?, ?)`,
            args: [name, duration_hours, price, description || '']
        });

        return NextResponse.json({
            success: true,
            packageId: Number(result.lastInsertRowid)
        });
    } catch (error) {
        console.error('Error creating package:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create package' },
            { status: 500 }
        );
    }
}

// Update package
export async function PUT(req: NextRequest) {
    try {
        await initializeDatabase();
        const body = await req.json();
        const { id, name, duration_hours, price, description } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Package ID is required' },
                { status: 400 }
            );
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (duration_hours !== undefined) {
            updates.push('duration_hours = ?');
            values.push(duration_hours);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            values.push(price);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No fields to update' },
                { status: 400 }
            );
        }

        values.push(id);

        await db.execute({
            sql: `UPDATE packages SET ${updates.join(', ')} WHERE id = ?`,
            args: values
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating package:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update package' },
            { status: 500 }
        );
    }
}

// Delete package
export async function DELETE(req: NextRequest) {
    try {
        await initializeDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Package ID is required' },
                { status: 400 }
            );
        }

        // Soft delete by setting is_active to 0
        await db.execute({
            sql: 'UPDATE packages SET is_active = 0 WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting package:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete package' },
            { status: 500 }
        );
    }
}
