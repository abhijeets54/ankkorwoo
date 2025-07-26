import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlugWithTags } from '@/lib/woocommerce';
import { cache, CACHE_TTL } from '@/lib/redis';

/**
 * API route to fetch a product with Redis caching
 * This serves as an example of how to use the Redis cache for API responses
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  const { handle } = params;
  
  if (!handle) {
    return NextResponse.json(
      { error: 'Product handle is required' },
      { status: 400 }
    );
  }

  try {
    // Define the cache key based on the product handle
    const cacheKey = `product:${handle}`;
    
    // Use the Redis cache utility to fetch and cache the product data
    const product = await cache(
      cacheKey,
      // This function will only be called on cache misses
      async () => {
        console.log(`Cache miss for product ${handle}, fetching from WooCommerce`);
        return getProductBySlugWithTags(handle); // Fetch from WooCommerce
      },
      CACHE_TTL.MEDIUM // Cache for 1 hour
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Return the product data with cache status
    return NextResponse.json({
      product,
      _cache: {
        key: cacheKey,
        ttl: CACHE_TTL.MEDIUM,
        expiresIn: `${Math.floor(CACHE_TTL.MEDIUM / 60)} minutes`
      }
    });
  } catch (error) {
    console.error(`Error fetching product ${handle}:`, error);
    
    return NextResponse.json(
      { error: 'Failed to fetch product', message: (error as Error).message },
      { status: 500 }
    );
  }
} 