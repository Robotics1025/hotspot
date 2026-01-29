// Admin stats API
import { NextResponse } from 'next/server';
import { getTodayStats, getRecentPayments, getActiveSessions, getPackages } from '@/lib/db';

export async function GET() {
    try {
        const stats = getTodayStats();
        const recentPayments = getRecentPayments(20);
        const activeSessions = getActiveSessions();
        const packages = getPackages();

        return NextResponse.json({
            success: true,
            stats,
            recentPayments,
            activeSessions,
            packages
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
