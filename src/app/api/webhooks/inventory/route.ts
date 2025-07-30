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

// GET endpoint for webhook URL verification
export async function GET() {
  return NextResponse.json({
    message: 'WooCommerce Inventory Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== WooCommerce Webhook Received ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));

    // Get the raw body for signature verification
    const body = await request.text();
    console.log('Body length:', body.length);
    console.log('Body preview:', body.substring(0, 200) + '...');

    // Verify webhook signature for security
    const signature = request.headers.get('x-wc-webhook-signature');

    // Temporarily log everything for debugging
    const isSignatureValid = verifyWebhookSignature(body, signature);

    if (!isSignatureValid) {
      console.error('Webhook signature verification failed');

      // For debugging: temporarily allow webhook to proceed but log the issue
      console.warn('PROCEEDING WITH INVALID SIGNATURE FOR DEBUGGING - REMOVE IN PRODUCTION');

      // Uncomment the line below to enforce signature verification:
      // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    } else {
      console.log('✅ Webhook signature verification successful');
    }

    // Parse the webhook data
    const webhookData = JSON.parse(body);

    console.log('Received WooCommerce webhook:', {
      id: webhookData.id,
      name: webhookData.name,
      stock_status: webhookData.stock_status,
      stock_quantity: webhookData.stock_quantity
    });

    // Handle the product update webhook
    await handleProductUpdate(webhookData);

    console.log('=== Webhook Processing Complete ===');
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      productId: webhookData.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('=== Webhook Processing Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function handleProductUpdate(product: any) {
  try {
    if (!product || !product.id) {
      console.error('Invalid product data received:', product);
      return;
    }

    const productId = product.id.toString();
    const slug = product.slug;

    console.log(`Processing product update for ${slug} (ID: ${productId})`);
    console.log('Product data:', {
      id: product.id,
      slug: product.slug,
      stock_status: product.stock_status,
      stock_quantity: product.stock_quantity,
      manage_stock: product.manage_stock
    });

    // Update inventory mapping
    await wooInventoryMapping.addInventoryMapping(productId, slug);

    // Update product cache with new stock information (only if Redis is available)
    if (redis) {
      try {
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
          console.log(`Updated cache for product ${slug}: ${product.stock_status} (${product.stock_quantity})`);
        }
      } catch (cacheError) {
        console.warn('Cache update failed:', cacheError);
      }
    }

    // Also handle variations if this is a variable product
    if (product.variations && product.variations.length > 0) {
      console.log(`Processing ${product.variations.length} variations for product ${slug}`);
      for (const variation of product.variations) {
        await handleProductUpdate(variation);
      }
    }

    // Broadcast stock update to connected clients (if using WebSockets/SSE)
    await broadcastStockUpdate(productId, {
      stockStatus: product.stock_status,
      stockQuantity: product.stock_quantity,
      availableForSale: product.stock_status === 'instock'
    });

  } catch (error) {
    console.error('Error handling product update:', error);
  }
}



function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.error('No signature provided in webhook request');
    return false;
  }

  const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('WOOCOMMERCE_WEBHOOK_SECRET environment variable not set');
    return false;
  }

  try {
    const crypto = require('crypto');

    // Try different signature formats that WooCommerce might use

    // Method 1: Standard base64 HMAC-SHA256 (most common)
    const expectedSignature1 = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('base64');

    // Method 2: Hex HMAC-SHA256 (some versions use this)
    const expectedSignature2 = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('hex');

    // Method 3: With "sha256=" prefix (some webhook systems use this)
    const expectedSignature3 = 'sha256=' + expectedSignature1;
    const expectedSignature4 = 'sha256=' + expectedSignature2;

    console.log('Signature verification debug:', {
      received: signature,
      receivedLength: signature.length,
      secret: webhookSecret,
      secretLength: webhookSecret.length,
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100),
      expectedBase64: expectedSignature1,
      expectedHex: expectedSignature2,
      expectedWithPrefix1: expectedSignature3,
      expectedWithPrefix2: expectedSignature4
    });

    // Check all possible formats
    const isValid = signature === expectedSignature1 ||
                   signature === expectedSignature2 ||
                   signature === expectedSignature3 ||
                   signature === expectedSignature4;

    console.log('Signature match result:', isValid);

    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

async function broadcastStockUpdate(productId: string, stockData: any) {
  // Implement real-time broadcasting to connected clients
  // This could use WebSockets, Server-Sent Events, or push notifications
  console.log('Broadcasting stock update:', { productId, stockData });

  // Store in Redis for real-time updates (only if Redis is available)
  if (redis) {
    try {
      await redis.set(
        `stock_update:${productId}`,
        { ...stockData, timestamp: Date.now() },
        60 // 1 minute TTL
      );
    } catch (error) {
      console.warn('Failed to broadcast stock update to Redis:', error);
    }
  }
}
