import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import * as wooInventoryMapping from '@/lib/wooInventoryMapping';

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Cache TTL constants
const CACHE_TTL = {
  PRODUCTS: 60 * 60 * 24, // 24 hours
  INVENTORY: 60 * 5, // 5 minutes for inventory updates
};

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature for security
    const signature = request.headers.get('x-wc-webhook-signature');
    const body = await request.text();
    
    // Verify webhook authenticity (implement your webhook secret verification)
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body);
    const { action, arg } = webhookData;

    console.log('Received inventory webhook:', { action, productId: arg?.id });

    // Handle different webhook events
    switch (action) {
      case 'woocommerce_product_stock_status_changed':
      case 'woocommerce_variation_stock_status_changed':
      case 'woocommerce_product_stock_reduced':
      case 'woocommerce_product_stock_increased':
        await handleStockUpdate(arg);
        break;
      
      case 'woocommerce_product_updated':
      case 'woocommerce_variation_updated':
        await handleProductUpdate(arg);
        break;
      
      default:
        console.log('Unhandled webhook action:', action);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleStockUpdate(product: any) {
  try {
    const productId = product.id.toString();
    const slug = product.slug;
    
    // Update inventory mapping
    await wooInventoryMapping.addInventoryMapping(productId, slug);
    
    // Update product cache with new stock information
    const productKey = `product:${slug}`;
    const cachedProduct = await redis.get(productKey);
    
    if (cachedProduct) {
      const updatedProduct = {
        ...cachedProduct,
        stockStatus: product.stock_status,
        stockQuantity: product.stock_quantity,
        availableForSale: product.stock_status === 'instock',
        _lastInventoryUpdate: new Date().toISOString(),
        _stockUpdateSource: 'webhook'
      };
      
      await redis.set(productKey, updatedProduct, CACHE_TTL.PRODUCTS);
      console.log(`Updated stock for product ${slug}: ${product.stock_status} (${product.stock_quantity})`);
    }
    
    // Also update variations if this is a variable product
    if (product.variations && product.variations.length > 0) {
      for (const variation of product.variations) {
        await handleStockUpdate(variation);
      }
    }
    
    // Broadcast stock update to connected clients (if using WebSockets/SSE)
    await broadcastStockUpdate(productId, {
      stockStatus: product.stock_status,
      stockQuantity: product.stock_quantity,
      availableForSale: product.stock_status === 'instock'
    });
    
  } catch (error) {
    console.error('Error handling stock update:', error);
  }
}

async function handleProductUpdate(product: any) {
  try {
    // Handle general product updates that might affect inventory
    await handleStockUpdate(product);
  } catch (error) {
    console.error('Error handling product update:', error);
  }
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  
  // Implement webhook signature verification
  // This should match your WooCommerce webhook secret
  const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  
  // WooCommerce uses HMAC-SHA256 for webhook signatures
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('base64');
  
  return signature === expectedSignature;
}

async function broadcastStockUpdate(productId: string, stockData: any) {
  // Implement real-time broadcasting to connected clients
  // This could use WebSockets, Server-Sent Events, or push notifications
  console.log('Broadcasting stock update:', { productId, stockData });
  
  // Example: Store in Redis for real-time updates
  await redis.set(
    `stock_update:${productId}`,
    { ...stockData, timestamp: Date.now() },
    60 // 1 minute TTL
  );
}
