import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Redis with fallback handling
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 2,
        delay: (attempt) => Math.min(attempt * 50, 200)
      }
    })
  : null;

// Simple polling endpoint for stock updates - Vercel-compatible
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productIds = searchParams.get('products')?.split(',').filter(Boolean) || [];

  if (productIds.length === 0) {
    return NextResponse.json({ 
      error: 'No products specified',
      updates: []
    }, { status: 400 });
  }

  // Validate product IDs
  const validProductIds = productIds.filter(id => id && id.trim().length > 0);
  if (validProductIds.length === 0) {
    return NextResponse.json({ 
      error: 'No valid product IDs provided',
      updates: []
    }, { status: 400 });
  }

  console.log(`Polling for stock updates on ${validProductIds.length} products`);

  const stockUpdates: any[] = [];

  if (!redis) {
    return NextResponse.json({
      success: true,
      updates: [],
      message: 'Redis not available - no stock updates',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Check each product for stock updates
    for (const productId of validProductIds) {
      try {
        const stockUpdateStr = await redis.get(`stock-update:${productId}`);
        
        if (stockUpdateStr) {
          // Parse the stock update data
          let stockUpdate: any;
          try {
            stockUpdate = typeof stockUpdateStr === 'string' ? JSON.parse(stockUpdateStr) : stockUpdateStr;
            
            // Ensure the update has required fields
            if (!stockUpdate.type) {
              stockUpdate.type = 'stock_update';
            }
            if (!stockUpdate.productId) {
              stockUpdate.productId = productId;
            }
            if (!stockUpdate.timestamp) {
              stockUpdate.timestamp = new Date().toISOString();
            }
            
            stockUpdates.push(stockUpdate);
            console.log(`Found stock update for product ${productId}`);
            
            // Remove the update after reading
            await redis.del(`stock-update:${productId}`);
            
          } catch (parseError) {
            console.error(`Error parsing stock update for ${productId}:`, parseError);
            continue;
          }
        }
      } catch (redisError) {
        console.warn(`Failed to check stock update for product ${productId}:`, redisError);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      updates: stockUpdates,
      checkedProducts: validProductIds.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error polling for stock updates:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to poll for stock updates',
      updates: [],
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to manually add stock update for testing
export async function POST(request: NextRequest) {
  try {
    const { productId, stockData } = await request.json();

    if (!productId || !stockData) {
      return NextResponse.json(
        { error: 'productId and stockData are required' },
        { status: 400 }
      );
    }

    if (!redis) {
      return NextResponse.json({
        success: false,
        error: 'Redis not available'
      }, { status: 503 });
    }

    const stockUpdate = {
      type: 'stock_update',
      productId: productId.trim(),
      timestamp: new Date().toISOString(),
      ...stockData
    };

    await redis.set(
      `stock-update:${productId}`,
      JSON.stringify(stockUpdate),
      { ex: 300 } // 5 minute TTL
    );

    console.log(`Stock update stored for product ${productId}`);

    return NextResponse.json({
      success: true,
      message: 'Stock update stored',
      productId,
      timestamp: stockUpdate.timestamp
    });

  } catch (error) {
    console.error('Error storing stock update:', error);
    return NextResponse.json(
      { 
        error: 'Failed to store stock update',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}