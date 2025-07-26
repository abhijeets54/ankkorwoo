import { NextRequest, NextResponse } from 'next/server';
import { revalidateInventory, revalidateAllPages } from '@/lib/revalidationHelper';
import { getAllProducts } from '@/lib/woocommerce';

/**
 * API route for periodic inventory reconciliation
 * This endpoint can be called by a cron job service like Vercel Cron, 
 * or by an uptime monitoring service like UptimeRobot or Cron-job.org
 * 
 * Recommended schedule: Every 15-30 minutes
 */

export async function GET(request: NextRequest) {
  try {
    // Verify authorization using a secret token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ 
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    // Fetch latest product data
    const productsData = await getAllProducts();
    
    console.log(`Fetched ${productsData?.length || 0} products`);
    
    // Perform your inventory reconciliation here
    // ...

    // Revalidate all inventory-related pages
    const revalidateResult = await revalidateInventory();
    
    return NextResponse.json({ 
      success: true, 
      productCount: productsData?.length || 0,
      revalidated: revalidateResult.success,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error in inventory-sync:', error);
    return NextResponse.json({ 
      error: 'Inventory sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Instructions for setting up with various CRON services:
 * 
 * Vercel Cron Jobs:
 * Add this to your vercel.json file:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/inventory-sync?token=YOUR_SECRET_TOKEN",
 *       "schedule": "every 30 minutes"
 *     }
 *   ]
 * }
 * 
 * Uptime Robot:
 * 1. Create a new monitor
 * 2. Select "HTTP(s)" as the monitor type
 * 3. Set the URL to: https://your-site.com/api/cron/inventory-sync?token=YOUR_SECRET_TOKEN
 * 4. Set the monitoring interval to 30 minutes
 * 
 * Google Cloud Scheduler:
 * 1. Create a new job
 * 2. Set the frequency to: every 30 minutes
 * 3. Set the target type to HTTP
 * 4. Set the URL to: https://your-site.com/api/cron/inventory-sync?token=YOUR_SECRET_TOKEN
 * 5. Set the HTTP method to GET
 */ 