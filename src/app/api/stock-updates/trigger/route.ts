import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getProductByIdWithStock } from '@/lib/woocommerce';

// Redis client for broadcasting stock updates - using Upstash REST client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 3,
        delay: Math.min
      }
    })
  : null;

interface StockUpdateTrigger {
  productId: string;
  type: 'cart_addition' | 'cart_removal' | 'reservation_expired' | 'manual_update';
  quantity?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: StockUpdateTrigger = await request.json();
    const { productId, type, quantity } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    console.log(`Stock update trigger: ${type} for product ${productId} (quantity: ${quantity || 'N/A'})`);

    // Get updated stock data from WooCommerce
    let stockData: any = null;
    
    try {
      const product = await getProductByIdWithStock(productId);
      if (product) {
        stockData = {
          stockStatus: product.stockStatus,
          stockQuantity: product.stockQuantity,
          availableForSale: product.stockStatus === 'IN_STOCK'
        };
      }
    } catch (error) {
      console.error('Failed to fetch stock data from WooCommerce:', error);
      // Continue without stock data - the update will still trigger re-validation
    }

    // Broadcast the stock update to all connected clients
    const updateMessage = JSON.stringify({
      type: 'stock_update',
      productId,
      stockStatus: stockData?.stockStatus,
      stockQuantity: stockData?.stockQuantity,
      availableForSale: stockData?.availableForSale,
      updateType: type,
      timestamp: new Date().toISOString()
    });

    // Store in Redis for immediate retrieval by SSE connections
    if (redis) {
      try {
        const key = `stock-update:${productId}`;
        await redis.set(key, updateMessage, { ex: 30 }); // Store for 30 seconds
        console.log(`Stock update stored for product ${productId}`);
      } catch (redisError) {
        console.error('Failed to store stock update in Redis:', redisError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stock update triggered successfully',
      productId,
      type,
      stockData
    });

  } catch (error) {
    console.error('Error triggering stock update:', error);
    return NextResponse.json(
      { error: 'Failed to trigger stock update' },
      { status: 500 }
    );
  }
}