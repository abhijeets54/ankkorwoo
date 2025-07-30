import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import * as wooInventoryMapping from '@/lib/wooInventoryMapping';

// Initialize Redis with fallback handling
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Cache TTL constants
const CACHE_TTL = {
  PRODUCTS: 60 * 60 * 24, // 24 hours
  INVENTORY: 60 * 5, // 5 minutes for inventory updates
};

// GET endpoint for webhook URL verification
export async function GET() {
  return NextResponse.json({ 
    message: 'WooCommerce Order Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('=== WooCommerce Order Webhook Received ===');

  try {
    // Log all headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Headers:', headers);

    // Get the raw body
    let body: string;
    try {
      body = await request.text();
      console.log('Body received, length:', body.length);
      console.log('Body preview:', body.substring(0, 200));
    } catch (bodyError) {
      console.error('Error reading request body:', bodyError);
      return NextResponse.json({
        error: 'Failed to read request body',
        details: bodyError instanceof Error ? bodyError.message : 'Unknown error'
      }, { status: 400 });
    }

    // Basic validation
    if (!body || body.length === 0) {
      console.error('Empty request body received');
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    // Parse the webhook data based on content type
    let webhookData: any;
    const contentType = request.headers.get('content-type') || '';
    
    console.log('Content-Type:', contentType);
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form-encoded data (WP REST API Integration v3 test)
      const params = new URLSearchParams(body);
      webhookData = Object.fromEntries(params.entries());
      console.log('Parsed form data:', webhookData);
      
      // This is likely a test ping from WooCommerce
      if (webhookData.webhook_id) {
        console.log('Received order webhook test ping, webhook_id:', webhookData.webhook_id);
        return NextResponse.json({ 
          success: true, 
          message: 'Order webhook test ping received successfully',
          webhook_id: webhookData.webhook_id,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Handle JSON data (actual order updates)
      try {
        webhookData = JSON.parse(body);
        console.log('JSON parsed successfully');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return NextResponse.json({
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        }, { status: 400 });
      }
    }

    // Log order data
    console.log('Order webhook data received:', {
      id: webhookData?.id,
      number: webhookData?.number,
      status: webhookData?.status,
      line_items: webhookData?.line_items?.length || 0
    });

    // Handle the order webhook
    await handleOrderUpdate(webhookData);

    console.log('=== Order Webhook Processing Complete ===');
    return NextResponse.json({ 
      success: true, 
      message: 'Order webhook processed successfully',
      orderId: webhookData.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('=== Order Webhook Processing Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Order webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function handleOrderUpdate(order: any) {
  try {
    if (!order || !order.id) {
      console.error('Invalid order data received:', order);
      return;
    }
    
    const orderId = order.id.toString();
    const orderStatus = order.status;
    const lineItems = order.line_items || [];
    
    console.log(`Processing order update for order ${orderId} (Status: ${orderStatus})`);
    console.log('Line items count:', lineItems.length);
    
    // Process each line item for stock updates
    for (const item of lineItems) {
      const productId = item.product_id?.toString();
      const variationId = item.variation_id?.toString();
      const quantity = item.quantity || 0;
      
      if (!productId) continue;
      
      console.log(`Processing line item: Product ${productId}, Variation ${variationId}, Quantity ${quantity}`);
      
      // Determine stock change based on order status
      let stockChange = 0;
      let changeReason = '';
      
      switch (orderStatus) {
        case 'processing':
        case 'completed':
          // Stock was reduced when order was created/processed
          stockChange = -quantity;
          changeReason = 'Order processed';
          break;
        case 'cancelled':
        case 'refunded':
        case 'failed':
          // Stock should be restored
          stockChange = quantity;
          changeReason = 'Order cancelled/refunded';
          break;
        default:
          console.log(`No stock change needed for order status: ${orderStatus}`);
          continue;
      }
      
      // Update product cache if we have stock changes
      if (stockChange !== 0) {
        await updateProductStockCache(productId, variationId, stockChange, changeReason);
        
        // Broadcast stock update
        await broadcastStockUpdate(productId, {
          stockChange,
          changeReason,
          orderId,
          orderStatus,
          timestamp: new Date().toISOString()
        });
      }
    }
    
  } catch (error) {
    console.error('Error handling order update:', error);
  }
}

async function updateProductStockCache(productId: string, variationId: string | null, stockChange: number, reason: string) {
  if (!redis) {
    console.log('Redis not available, skipping cache update');
    return;
  }
  
  try {
    // Update product cache
    const productKey = `product:${productId}`;
    const cachedProduct = await redis.get(productKey);
    
    if (cachedProduct && typeof cachedProduct === 'object') {
      const updatedProduct = {
        ...cachedProduct,
        _lastStockChange: {
          change: stockChange,
          reason,
          timestamp: new Date().toISOString()
        }
      };
      
      await redis.set(productKey, updatedProduct, CACHE_TTL.PRODUCTS);
      console.log(`Updated cache for product ${productId}: ${reason} (${stockChange > 0 ? '+' : ''}${stockChange})`);
    }
    
  } catch (error) {
    console.error('Error updating product stock cache:', error);
  }
}

async function broadcastStockUpdate(productId: string, updateData: any) {
  if (!redis) {
    console.log('Redis not available, skipping broadcast');
    return;
  }
  
  try {
    await redis.set(
      `stock_update:${productId}`,
      { ...updateData, productId, timestamp: Date.now() },
      60 // 1 minute TTL
    );
    console.log('Broadcasted stock update for product:', productId);
  } catch (error) {
    console.error('Failed to broadcast stock update:', error);
  }
}
