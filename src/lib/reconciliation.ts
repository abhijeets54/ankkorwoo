import * as woocommerce from './woocommerce';
import { getInventoryMapping, updateInventoryMapping } from './wooInventoryMapping';
import * as wooInventoryMapping from './wooInventoryMapping';
import { revalidatePath } from 'next/cache';

/**
 * Reconciliation utility for making sure WooCommerce inventory data is synchronized
 * This helps mitigate issues with missed webhooks and ensures data consistency
 */

// Store the last time we ran a reconciliation for each entity type
const lastReconciliationTimes: Record<string, number> = {
  'all-products': 0,
  'product-inventory': 0
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 3 * 60 * 60 * 1000 // 3 hours
};

/**
 * Reconciles inventory data between WooCommerce and our local mapping
 */
export async function reconcileInventory() {
  try {
    console.log('Starting inventory reconciliation...');
    
    // Get all products from WooCommerce
    const products = await woocommerce.getProducts();
    
    // Get current inventory mapping
    const inventoryMapping = await getInventoryMapping();
    
    // Track stats
    let updated = 0;
    let unchanged = 0;
    let added = 0;
    
    // Process each product
    for (const product of products) {
      const productId = product.id.toString();
      
      // Check if product exists in mapping
      if (inventoryMapping[productId]) {
        // Update inventory if changed
        if (inventoryMapping[productId].inventory !== product.stock_quantity) {
          inventoryMapping[productId].inventory = product.stock_quantity || 0;
          updated++;
        } else {
          unchanged++;
        }
      } else {
        // Add new product to mapping
        inventoryMapping[productId] = {
          wooId: productId,
          inventory: product.stock_quantity || 0,
          sku: product.sku || '',
          title: product.name || '',
          lastUpdated: new Date().toISOString()
        };
        added++;
      }
    }
    
    // Save updated mapping
    await updateInventoryMapping(inventoryMapping);
    
    // Revalidate product pages
    revalidatePath('/product/[slug]');
    revalidatePath('/categories');
    
    console.log(`Reconciliation complete: ${updated} updated, ${added} added, ${unchanged} unchanged`);
    
    return {
      success: true,
      stats: { updated, added, unchanged }
    };
  } catch (error) {
    console.error('Error during inventory reconciliation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reconcile all products - comprehensive sync of all product data
 */
export async function reconcileAllProducts() {
  try {
    console.log('Starting full product reconciliation...');

    // Get all products from WooCommerce
    const products = await woocommerce.getAllProducts(100);

    if (!products || products.length === 0) {
      console.log('No products found to reconcile');
      return {
        success: true,
        message: 'No products found',
        productsProcessed: 0
      };
    }

    console.log(`Found ${products.length} products to reconcile`);

    // Process each product
    let processedCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        // Normalize and process product data
        const normalizedProduct = woocommerce.normalizeProduct(product);

        if (normalizedProduct) {
          // Update inventory mapping
          await wooInventoryMapping.addInventoryMapping(
            product.databaseId.toString(),
            product.slug
          );

          processedCount++;
        }
      } catch (error) {
        const errorMsg = `Failed to process product ${product.slug}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Successfully reconciled ${processedCount} products`);

    return {
      success: true,
      message: `Reconciled ${processedCount} products`,
      productsProcessed: processedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error in reconcileAllProducts:', error);
    return {
      success: false,
      message: `Failed to reconcile products: ${error}`,
      productsProcessed: 0
    };
  }
}

/**
 * Reconcile a specific product by handle/slug
 */
export async function reconcileProductByHandle(handle: string) {
  try {
    console.log(`Starting reconciliation for product: ${handle}`);

    // Get the specific product from WooCommerce
    const product = await woocommerce.getProductBySlug(handle);

    if (!product) {
      return {
        success: false,
        message: `Product not found: ${handle}`,
        productHandle: handle
      };
    }

    // Normalize product data
    const normalizedProduct = woocommerce.normalizeProduct(product);

    if (normalizedProduct) {
      // Update inventory mapping
      await wooInventoryMapping.addInventoryMapping(
        product.databaseId.toString(),
        product.slug
      );

      console.log(`Successfully reconciled product: ${handle}`);

      return {
        success: true,
        message: `Successfully reconciled product: ${handle}`,
        productHandle: handle,
        product: normalizedProduct
      };
    } else {
      return {
        success: false,
        message: `Failed to normalize product: ${handle}`,
        productHandle: handle
      };
    }
  } catch (error) {
    console.error(`Error reconciling product ${handle}:`, error);
    return {
      success: false,
      message: `Failed to reconcile product ${handle}: ${error}`,
      productHandle: handle
    };
  }
}

// Export the cache durations for reference elsewhere
export const ReconciliationCacheDuration = CACHE_DURATION;