// API route to get all packages
import { NextResponse } from 'next/server';
import { getPackages } from '@/lib/db';

export async function GET() {
    try {
        const packages = getPackages();
        return NextResponse.json({ success: true, packages });
    } catch (error) {
        console.error('Error fetching packages:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch packages' },
            { status: 500 }
        );
    }
}
