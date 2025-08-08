import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis with fallback handling and better error handling
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 3,
        delay: (attempt) => Math.min(attempt * 50, 500) // 50ms, 100ms, 150ms, etc. up to 500ms
      }
    })
  : null;

// Track active connections to prevent resource exhaustion
let activeConnections = 0;
const MAX_CONNECTIONS = 20; // Increased from 10 but still reasonable
const connections = new Set<ReadableStreamDefaultController>();

// Connection cleanup interval
const CONNECTION_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CONNECTION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// Server-Sent Events endpoint for real-time stock updates
export async function GET(request: NextRequest) {
  // Check connection limit
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log(`Connection rejected: limit reached (${activeConnections}/${MAX_CONNECTIONS})`);
    return new Response('Too many concurrent connections', { 
      status: 429,
      headers: {
        'Retry-After': '30'
      }
    });
  }

  const { searchParams } = new URL(request.url);
  const productIds = searchParams.get('products')?.split(',').filter(Boolean) || [];

  if (productIds.length === 0) {
    return new Response('No products specified', { status: 400 });
  }

  // Validate product IDs (basic validation)
  const validProductIds = productIds.filter(id => id && id.trim().length > 0);
  if (validProductIds.length === 0) {
    return new Response('No valid product IDs provided', { status: 400 });
  }

  console.log(`New SSE connection request for ${validProductIds.length} products: [${validProductIds.join(', ')}]`);

  // Set up SSE headers with improved caching and CORS
  const headers = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Connection': 'keep-alive',
    'Content-Encoding': 'none',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
    'Access-Control-Expose-Headers': 'Content-Type',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Increment active connection count and track controller
      activeConnections++;
      connections.add(controller);
      const connectionId = Math.random().toString(36).substring(7);
      console.log(`SSE connection ${connectionId} established for ${validProductIds.length} products (${activeConnections} active)`);

      // Send initial connection message with connection info
      const initialMessage = {
        type: 'connected',
        message: 'Stock updates stream connected',
        connectionId,
        products: validProductIds,
        timestamp: new Date().toISOString()
      };

      try {
        controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`);
      } catch (error) {
        console.error('Failed to send initial message:', error);
      }

      // Connection tracking
      let consecutiveErrors = 0;
      let isDisabled = false;
      let lastActivityTime = Date.now();
      const maxErrors = 5;
      const errorResetInterval = 60000; // Reset error count after 1 minute of success
      
      // Function to check for stock updates with better error handling
      const checkStockUpdates = async () => {
        if (!redis || isDisabled) {
          return;
        }

        const currentTime = Date.now();

        // Skip if too many consecutive errors
        if (consecutiveErrors >= maxErrors) {
          if (!isDisabled) {
            isDisabled = true;
            console.log(`Connection ${connectionId}: Too many Redis errors, disabling stock update checks for 60 seconds`);
            
            try {
              controller.enqueue(`data: ${JSON.stringify({
                type: 'error',
                message: 'Stock update service temporarily disabled due to errors',
                timestamp: new Date().toISOString()
              })}\n\n`);
            } catch (error) {
              // Controller closed, ignore
            }
            
            // Re-enable after 60 seconds
            setTimeout(() => {
              consecutiveErrors = 0;
              isDisabled = false;
              console.log(`Connection ${connectionId}: Re-enabling stock update checks`);
            }, 60000);
          }
          return;
        }

        try {
          let foundUpdates = false;

          // Check each product for stock updates
          for (const productId of validProductIds) {
            try {
              const stockUpdateStr = await redis.get(`stock-update:${productId}`);
              
              if (stockUpdateStr) {
                foundUpdates = true;
                lastActivityTime = currentTime;
                
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
                  
                } catch (parseError) {
                  console.error(`Connection ${connectionId}: Error parsing stock update for ${productId}:`, parseError);
                  continue;
                }

                // Send stock update to client
                try {
                  controller.enqueue(`data: ${JSON.stringify(stockUpdate)}\n\n`);
                  console.log(`Connection ${connectionId}: Sent stock update for product ${productId}`);
                } catch (enqueueError) {
                  console.log(`Connection ${connectionId}: Controller closed while sending update`);
                  return; // Controller closed, stop processing
                }

                // Remove the update after sending (in background)
                redis.del(`stock-update:${productId}`).catch(err => {
                  console.warn(`Connection ${connectionId}: Failed to delete stock update key for ${productId}:`, err);
                });
              }
            } catch (redisError) {
              // Log individual Redis errors but continue with other products
              console.warn(`Connection ${connectionId}: Failed to check stock update for product ${productId}:`, redisError);
              consecutiveErrors++;
            }
          }
          
          // Reset error counter on successful operation (even if no updates found)
          if (consecutiveErrors > 0) {
            console.log(`Connection ${connectionId}: Resetting error count from ${consecutiveErrors} to 0`);
            consecutiveErrors = 0;
          }
          
        } catch (error) {
          consecutiveErrors++;
          console.error(`Connection ${connectionId}: Error checking stock updates (attempt ${consecutiveErrors}/${maxErrors}):`, error);

          // Send error notification on first error to avoid spam
          if (consecutiveErrors === 1) {
            try {
              controller.enqueue(`data: ${JSON.stringify({
                type: 'error',
                message: 'Stock update service temporarily experiencing issues',
                timestamp: new Date().toISOString()
              })}\n\n`);
            } catch (error) {
              // Controller closed, ignore
            }
          }
        }
      };

      // Check for updates every 15 seconds (reduced from 20 to be more responsive)
      let updateInterval: NodeJS.Timeout | null = null;
      if (redis) {
        // Initial check after 2 seconds
        setTimeout(checkStockUpdates, 2000);
        updateInterval = setInterval(checkStockUpdates, 15000);
      } else {
        console.log(`Connection ${connectionId}: Redis not available, stock updates polling disabled`);
        // Send notification to client that real-time updates are not available
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'service_unavailable',
            message: 'Real-time stock updates are currently unavailable - Redis not configured',
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          // Controller closed, ignore
        }
      }

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (isCleanedUp) return;
        
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'heartbeat',
            connectionId,
            activeProducts: validProductIds.length,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          // Controller closed, cleanup if not already done
          console.log(`Connection ${connectionId}: Heartbeat failed, cleaning up`);
          cleanup();
        }
      }, 30000);

      // Cleanup function
      let isCleanedUp = false;
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        
        console.log(`Connection ${connectionId}: Cleaning up SSE connection`);
        
        // Remove from tracking and decrement count
        connections.delete(controller);
        activeConnections = Math.max(0, activeConnections - 1);
        console.log(`SSE connection ${connectionId} closed (${activeConnections} active)`);
        
        // Clear intervals
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
        clearInterval(heartbeat);
        
        // Close controller
        try {
          controller.close();
        } catch (error) {
          // Controller already closed, ignore
        }
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`Connection ${connectionId}: Client disconnected`);
        cleanup();
      });

      // Auto-cleanup after CONNECTION_TIMEOUT
      setTimeout(() => {
        console.log(`Connection ${connectionId}: Timeout reached, closing connection`);
        cleanup();
      }, CONNECTION_TIMEOUT);

      // Store cleanup function for external access
      (controller as any).cleanup = cleanup;
      (controller as any).connectionId = connectionId;
    },
    
    cancel() {
      console.log('SSE stream cancelled by client');
    }
  });

  return new Response(stream, { headers });
}

// Cleanup endpoint to force close stale connections
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    
    if (connectionId) {
      // Close specific connection
      let found = false;
      connections.forEach(controller => {
        if ((controller as any).connectionId === connectionId) {
          try {
            (controller as any).cleanup?.();
            found = true;
          } catch (error) {
            console.error('Error closing specific connection:', error);
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        message: found ? `Closed connection ${connectionId}` : `Connection ${connectionId} not found`,
        activeConnections
      });
    } else {
      // Force close all connections
      const connectionCount = connections.size;
      const closedConnections: string[] = [];
      
      connections.forEach(controller => {
        try {
          const id = (controller as any).connectionId || 'unknown';
          closedConnections.push(id);
          (controller as any).cleanup?.();
        } catch (error) {
          console.error('Error during connection cleanup:', error);
        }
      });
      
      // Clear the set and reset counter
      connections.clear();
      activeConnections = 0;
      
      console.log(`Force closed ${connectionCount} connections: [${closedConnections.join(', ')}]`);
      
      return NextResponse.json({
        success: true,
        message: `Closed ${connectionCount} connections`,
        closedConnections,
        activeConnections: 0
      });
    }
  } catch (error) {
    console.error('Error in DELETE cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup connections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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

    // Validate productId
    if (typeof productId !== 'string' || productId.trim().length === 0) {
      return NextResponse.json(
        { error: 'productId must be a non-empty string' },
        { status: 400 }
      );
    }

    // Ensure stockData has required fields
    const stockUpdate = {
      type: 'stock_update',
      productId: productId.trim(),
      timestamp: new Date().toISOString(),
      ...stockData
    };

    // Store stock update for SSE to pick up
    if (redis) {
      try {
        await redis.set(
          `stock-update:${productId}`, // ✅ Fixed: using hyphen not underscore
          JSON.stringify(stockUpdate),
          { ex: 300 } // Increased TTL to 5 minutes
        );
        
        console.log(`Stock update notification stored for product ${productId}`);
        
      } catch (redisError) {
        console.error('Redis error in stock update POST:', redisError);
        return NextResponse.json({
          success: false,
          error: 'Failed to store stock update notification',
          details: redisError instanceof Error ? redisError.message : 'Redis error'
        }, { status: 500 });
      }
    } else {
      console.warn('Redis not available, stock update notification not stored');
      return NextResponse.json({
        success: false,
        error: 'Stock update service not available - Redis not configured'
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: 'Stock update notification sent',
      productId,
      timestamp: stockUpdate.timestamp,
      activeConnections
    });

  } catch (error) {
    console.error('Error sending stock update notification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send stock update notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for connection status (useful for debugging)
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    activeConnections,
    maxConnections: MAX_CONNECTIONS,
    connectionTimeout: CONNECTION_TIMEOUT,
    connections: Array.from(connections).map(controller => ({
      connectionId: (controller as any).connectionId || 'unknown',
      // Add more connection info if needed
    })),
    redisAvailable: !!redis,
    timestamp: new Date().toISOString()
  });
}

// Periodic cleanup of stale connections (run this in a separate process or cron job)
setInterval(() => {
  const staleConnections: any[] = [];
  
  connections.forEach(controller => {
    // Check if controller is still responsive
    try {
      // This is a simple check - you might want more sophisticated detection
      if ((controller as any).desiredSize === null) {
        staleConnections.push(controller);
      }
    } catch (error) {
      staleConnections.push(controller);
    }
  });
  
  if (staleConnections.length > 0) {
    console.log(`Cleaning up ${staleConnections.length} stale connections`);
    staleConnections.forEach(controller => {
      try {
        (controller as any).cleanup?.();
      } catch (error) {
        console.error('Error cleaning up stale connection:', error);
      }
    });
  }
}, CONNECTION_CLEANUP_INTERVAL);