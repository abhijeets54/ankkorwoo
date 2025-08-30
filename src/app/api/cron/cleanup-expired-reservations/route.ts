import { NextRequest, NextResponse } from 'next/server';
import { StockReservationService } from '@/services/StockReservationService';
import { withAppRouterErrorHandling } from '@/lib/errorHandling';

const stockService = new StockReservationService();

export const GET = withAppRouterErrorHandling(async (request: NextRequest) => {
  // Verify this is a Vercel cron request
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron request attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('🧹 Starting expired reservations cleanup...');

  try {
    const cleanedCount = await stockService.cleanupExpiredReservations();
    const duration = Date.now() - startTime;

    const result = {
      success: true,
      cleanedReservations: cleanedCount,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Reservations cleanup completed:', result);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    console.error('❌ Reservations cleanup failed:', errorResult);
    
    return NextResponse.json(errorResult, { status: 500 });
  }
});

// Also support POST for manual triggers
export const POST = GET;