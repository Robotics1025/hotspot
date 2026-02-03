import { NextRequest, NextResponse } from 'next/server';
import { deactivateSession } from '@/lib/db';

// Disconnect a user session
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'Session ID is required' },
                { status: 400 }
            );
        }

        await deactivateSession(sessionId);

        return NextResponse.json({
            success: true,
            message: 'User disconnected successfully'
        });
    } catch (error) {
        console.error('Error disconnecting user:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to disconnect user' },
            { status: 500 }
        );
    }
}
