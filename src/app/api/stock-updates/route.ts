import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis with fallback handling
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Server-Sent Events endpoint for real-time stock updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productIds = searchParams.get('products')?.split(',') || [];

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Stock updates stream connected',
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Function to check for stock updates
      const checkStockUpdates = async () => {
        if (!redis) {
          console.log('Redis not available, skipping stock update check');
          return;
        }

        try {
          for (const productId of productIds) {
            const stockUpdate = await redis.get(`stock_update:${productId}`);
            if (stockUpdate) {
              // Send stock update to client
              try {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'stock_update',
                  productId,
                  ...stockUpdate,
                  timestamp: new Date().toISOString()
                })}\n\n`);
              } catch (error) {
                // Controller closed, stop checking
                return;
              }

              // Remove the update after sending (optional)
              await redis.del(`stock_update:${productId}`);
            }
          }
        } catch (error) {
          console.error('Error checking stock updates:', error);

          // Send error notification to client
          try {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'error',
              message: 'Stock update service temporarily unavailable',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } catch (error) {
            // Controller closed, ignore
          }
        }
      };

      // Check for updates every 5 seconds (only if Redis is available)
      let interval: NodeJS.Timeout | null = null;
      if (redis) {
        interval = setInterval(checkStockUpdates, 5000);
        console.log('Started stock updates polling (Redis available)');
      } else {
        console.log('Redis not available, stock updates polling disabled');
        // Send notification to client that real-time updates are not available
        controller.enqueue(`data: ${JSON.stringify({
          type: 'service_unavailable',
          message: 'Real-time stock updates are currently unavailable',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (isCleanedUp) return;
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          // Controller closed, cleanup if not already done
          cleanup();
        }
      }, 30000);

      // Cleanup function
      let isCleanedUp = false;
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        
        if (interval) clearInterval(interval);
        clearInterval(heartbeat);
        
        try {
          controller.close();
        } catch (error) {
          // Controller already closed, ignore
        }
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);

      // Auto-cleanup after 5 minutes
      setTimeout(cleanup, 5 * 60 * 1000);
    }
  });

  return new Response(stream, { headers });
}

// POST endpoint to manually trigger stock update notifications
export async function POST(request: NextRequest) {
  try {
    const { productId, stockData } = await request.json();

    if (!productId || !stockData) {
      return NextResponse.json(
        { error: 'productId and stockData are required' },
        { status: 400 }
      );
    }

    // Store stock update for SSE to pick up
    if (redis) {
      await redis.set(
        `stock_update:${productId}`,
        stockData,
        60 // 1 minute TTL
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stock update notification sent',
      productId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending stock update notification:', error);
    return NextResponse.json(
      { error: 'Failed to send stock update notification' },
      { status: 500 }
    );
  }
}
