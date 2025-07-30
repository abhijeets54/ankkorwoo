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
  console.log('=== WooCommerce Webhook Received ===');

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
        console.log('Received webhook test ping, webhook_id:', webhookData.webhook_id);
        return NextResponse.json({
          success: true,
          message: 'Webhook test ping received successfully',
          webhook_id: webhookData.webhook_id,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Handle JSON data (actual product updates)
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

    // Log webhook data
    console.log('Webhook data received:', {
      id: webhookData?.id,
      name: webhookData?.name,
      slug: webhookData?.slug,
      stock_status: webhookData?.stock_status,
      stock_quantity: webhookData?.stock_quantity
    });

    // Skip signature verification for now to debug
    console.log('Skipping signature verification for debugging');

    // Determine webhook type from headers or URL
    const webhookTopic = request.headers.get('x-wc-webhook-topic') || 'product.updated';
    console.log('Webhook topic:', webhookTopic);

    // Process the webhook
    try {
      // Handle different webhook types
      switch (webhookTopic) {
        case 'product.created':
          await handleProductCreated(webhookData);
          break;
        case 'product.updated':
          await handleProductUpdate(webhookData);
          break;
        case 'product.deleted':
          await handleProductDeleted(webhookData);
          break;
        default:
          console.log('Handling as product update (default)');
          await handleProductUpdate(webhookData);
      }
      console.log('Webhook handled successfully');
    } catch (updateError) {
      console.error('Error in handleProductUpdate:', updateError);
      // Don't fail the webhook for processing errors
    }

    console.log('=== Webhook Processing Complete ===');
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      productId: webhookData?.id || 'unknown',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== Critical Webhook Error ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Always return 200 to prevent WooCommerce from retrying
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Changed to 200 to prevent retries
  }
}

async function handleProductCreated(product: any) {
  try {
    if (!product || !product.id) {
      console.error('Invalid product data received:', product);
      return;
    }

    const productId = product.id.toString();
    const slug = product.slug;

    console.log(`Processing new product creation: ${slug} (ID: ${productId})`);

    // Add inventory mapping for new product
    await wooInventoryMapping.addInventoryMapping(productId, slug);

    // Cache the new product (only if Redis is available)
    if (redis) {
      try {
        const productKey = `product:${slug}`;
        const productData = {
          id: product.id,
          databaseId: product.id,
          name: product.name,
          slug: product.slug,
          stockStatus: product.stock_status,
          stockQuantity: product.stock_quantity,
          availableForSale: product.stock_status === 'instock',
          _lastInventoryUpdate: new Date().toISOString(),
          _stockUpdateSource: 'webhook_created'
        };

        await redis.set(productKey, productData, CACHE_TTL.PRODUCTS);
        console.log(`Cached new product ${slug}`);
      } catch (cacheError) {
        console.warn('Cache creation failed:', cacheError);
      }
    }

    // Broadcast product creation
    await broadcastStockUpdate(productId, {
      type: 'product_created',
      stockStatus: product.stock_status,
      stockQuantity: product.stock_quantity,
      availableForSale: product.stock_status === 'instock'
    });

  } catch (error) {
    console.error('Error handling product creation:', error);
  }
}

async function handleProductDeleted(product: any) {
  try {
    if (!product || !product.id) {
      console.error('Invalid product data received:', product);
      return;
    }

    const productId = product.id.toString();
    const slug = product.slug;

    console.log(`Processing product deletion: ${slug} (ID: ${productId})`);

    // Remove from cache (only if Redis is available)
    if (redis) {
      try {
        const productKey = `product:${slug}`;
        await redis.del(productKey);
        console.log(`Removed product ${slug} from cache`);
      } catch (cacheError) {
        console.warn('Cache deletion failed:', cacheError);
      }
    }

    // Broadcast product deletion
    await broadcastStockUpdate(productId, {
      type: 'product_deleted',
      stockStatus: 'deleted',
      availableForSale: false
    });

  } catch (error) {
    console.error('Error handling product deletion:', error);
  }
}

async function handleProductUpdate(product: any) {
  console.log('=== handleProductUpdate called ===');

  try {
    if (!product) {
      console.log('No product data provided');
      return;
    }

    if (!product.id) {
      console.log('Product missing ID field');
      return;
    }

    const productId = product.id.toString();
    const slug = product.slug || `product-${productId}`;

    console.log(`Processing product: ${slug} (ID: ${productId})`);

    // Update inventory mapping (with error handling)
    try {
      await wooInventoryMapping.addInventoryMapping(productId, slug);
      console.log('Inventory mapping updated successfully');
    } catch (mappingError) {
      console.error('Inventory mapping failed:', mappingError);
    }

    // Update Redis cache (if available)
    if (redis) {
      try {
        const productKey = `product:${slug}`;
        const stockStatus = product.stock_status || 'unknown';
        const stockQuantity = product.stock_quantity || 0;

        const updatedProduct = {
          id: productId,
          slug: slug,
          stockStatus: stockStatus,
          stockQuantity: stockQuantity,
          availableForSale: stockStatus === 'instock',
          _lastInventoryUpdate: new Date().toISOString(),
          _stockUpdateSource: 'webhook'
        };

        await redis.set(productKey, updatedProduct, { ex: CACHE_TTL.PRODUCTS });
        console.log(`Cache updated: ${slug} -> ${stockStatus} (${stockQuantity})`);
      } catch (cacheError) {
        console.error('Cache update failed:', cacheError);
      }
    } else {
      console.log('Redis not available, skipping cache update');
    }

    // Broadcast update (with error handling)
    try {
      await broadcastStockUpdate(productId, {
        stockStatus: product.stock_status,
        stockQuantity: product.stock_quantity,
        availableForSale: product.stock_status === 'instock'
      });
      console.log('Stock update broadcast completed');
    } catch (broadcastError) {
      console.error('Broadcast failed:', broadcastError);
    }

    console.log('=== handleProductUpdate completed ===');

  } catch (error) {
    console.error('=== handleProductUpdate error ===');
    console.error('Error details:', error);
    // Don't throw - let the webhook succeed even if processing fails
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
        { ex: 60 } // 1 minute TTL
      );
    } catch (error) {
      console.warn('Failed to broadcast stock update to Redis:', error);
    }
  }
}
