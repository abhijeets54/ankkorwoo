import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@upstash/qstash/nextjs';

import * as woocommerce from '@/lib/woocommerce';
import * as wooInventoryMapping from '@/lib/wooInventoryMapping';
import * as redis from '@/lib/redis';

// Cache TTLs
const CACHE_TTL = {
  PRODUCTS: 60 * 60, // 1 hour
  CATEGORIES: 60 * 60 * 24, // 24 hours
};

// Handler for the WooCommerce sync endpoint
async function handler(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    
    // Verify the token for security
    if (body.token !== process.env.WOOCOMMERCE_REVALIDATION_SECRET) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    
    // Determine sync type
    const syncType = body.type || 'inventory';
    
    console.log(`Starting WooCommerce ${syncType} sync at ${new Date().toISOString()}`);
    
    switch (syncType) {
      case 'inventory':
        await syncInventory();
        break;
        
      case 'all':
        await syncAllProducts();
        break;
        
      case 'categories':
        await syncCategories();
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid sync type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully completed WooCommerce ${syncType} sync`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during WooCommerce sync:', error);
    return NextResponse.json(
      { success: false, error: 'Sync operation failed' },
      { status: 500 }
    );
  }
}

/**
 * Sync inventory data only - faster and less resource intensive
 */
async function syncInventory() {
  console.log('Syncing WooCommerce inventory...');
  
  try {
    // Get all products with basic inventory data
    // This is more efficient than getting all product details
    const products = await woocommerce.getAllProducts(100);
    
    if (!products || products.length === 0) {
      console.log('No products found to sync inventory');
      return;
    }
    
    console.log(`Found ${products.length} products to sync inventory`);
    
    // Prepare inventory mappings
    const inventoryMappings = products.map(product => ({
      productId: product.databaseId.toString(),
      productSlug: product.slug
    }));
    
    // Update inventory mappings in Redis
    await wooInventoryMapping.updateInventoryMappings(inventoryMappings);
    
    // Update product cache with availability information
    for (const product of products) {
      const productKey = `product:${product.slug}`;
      const cachedProduct = await redis.get(productKey);
      
      if (cachedProduct) {
        // Update availability information in cache without fetching full product
        const updatedProduct = {
          ...cachedProduct,
          availableForSale: 
            product.stockStatus === 'IN_STOCK' || 
            (product.variations?.nodes?.some(v => v.stockStatus === 'IN_STOCK')),
          // Add a timestamp for debugging/monitoring
          _lastInventoryUpdate: new Date().toISOString()
        };
        
        await redis.set(productKey, updatedProduct, CACHE_TTL.PRODUCTS);
      }
    }
    
    console.log(`Successfully updated inventory for ${products.length} products`);
  } catch (error) {
    console.error('Error syncing WooCommerce inventory:', error);
    throw error;
  }
}

/**
 * Sync all product data - more thorough but resource intensive
 */
async function syncAllProducts() {
  console.log('Syncing all WooCommerce products...');
  
  try {
    // Get all products with complete details
    const products = await woocommerce.getAllProducts(100);
    
    if (!products || products.length === 0) {
      console.log('No products found to sync');
      return;
    }
    
    console.log(`Found ${products.length} products to sync`);
    
    // First update inventory mappings
    const inventoryMappings = products.map(product => ({
      productId: product.databaseId.toString(),
      productSlug: product.slug
    }));
    
    await wooInventoryMapping.updateInventoryMappings(inventoryMappings);
    
    // Process each product
    for (const product of products) {
      // Normalize product data
      const normalizedProduct = woocommerce.normalizeProduct(product);
      
      if (normalizedProduct) {
        // Store in Redis cache
        const productKey = `product:${normalizedProduct.handle}`;
        await redis.set(productKey, normalizedProduct, CACHE_TTL.PRODUCTS);
      }
    }
    
    // Invalidate cache for product listings
    await redis.del('all_products');
    await redis.del('featured_products');
    
    console.log(`Successfully synced ${products.length} products`);
  } catch (error) {
    console.error('Error syncing all WooCommerce products:', error);
    throw error;
  }
}

/**
 * Sync product categories
 */
async function syncCategories() {
  console.log('Syncing WooCommerce categories...');
  
  try {
    // Get all categories
    const categories = await woocommerce.getAllCategories(50);
    
    if (!categories || categories.length === 0) {
      console.log('No categories found to sync');
      return;
    }
    
    console.log(`Found ${categories.length} categories to sync`);
    
    // Process each category
    for (const category of categories) {
      // Normalize category data
      const normalizedCategory = woocommerce.normalizeCategory(category);
      
      if (normalizedCategory) {
        // Store in Redis cache
        const categoryKey = `category:${normalizedCategory.handle}`;
        await redis.set(categoryKey, normalizedCategory, CACHE_TTL.CATEGORIES);
      }
    }
    
    // Store all categories list
    const normalizedCategories = categories
      .map(woocommerce.normalizeCategory)
      .filter(Boolean);
    
    await redis.set('all_categories', normalizedCategories, CACHE_TTL.CATEGORIES);
    
    console.log(`Successfully synced ${categories.length} categories`);
  } catch (error) {
    console.error('Error syncing WooCommerce categories:', error);
    throw error;
  }
}

// Wrap the handler with QStash signature verification for production
// In development, use the handler directly
export const POST = process.env.NODE_ENV === 'production'
  ? verifySignature(handler)
  : handler; 