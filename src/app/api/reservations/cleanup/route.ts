import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredReservations } from '@/lib/stockReservation';

// GET - Manual cleanup trigger (for testing)
export async function GET() {
  try {
    const cleanedUp = await cleanupExpiredReservations();
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedUp} expired reservations`,
      cleanedUp,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// POST - Scheduled cleanup (called by cron job or webhook)
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cleanup request
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_SECRET_TOKEN || 'cleanup_secret_token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const cleanedUp = await cleanupExpiredReservations();
    
    console.log(`Scheduled cleanup completed: ${cleanedUp} reservations removed`);
    
    return NextResponse.json({
      success: true,
      message: `Scheduled cleanup completed: ${cleanedUp} reservations removed`,
      cleanedUp,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in scheduled cleanup:', error);
    return NextResponse.json(
      { error: 'Scheduled cleanup failed' },
      { status: 500 }
    );
  }
}
