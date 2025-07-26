import { Redis } from '@upstash/redis';

// Type for inventory mapping
type InventoryMap = Record<string, string>;

// Redis key prefix for inventory mappings
const KEY_PREFIX = 'woo:inventory:mapping:';
// Redis key for the mapping between Shopify and WooCommerce IDs
const SHOPIFY_TO_WOO_KEY = 'shopify:to:woo:mapping';

// Initialize Redis client with support for both Upstash Redis and Vercel KV variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 
       process.env.NEXT_PUBLIC_KV_REST_API_URL || 
       '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 
         process.env.NEXT_PUBLIC_KV_REST_API_TOKEN || 
         '',
});

// In-memory fallback for local development or when Redis is unavailable
const memoryStorage: InventoryMap = {};
const shopifyToWooMemoryStorage: Record<string, string> = {};

// Inventory mapping type
export interface InventoryMapping {
  [productId: string]: {
    wooId: string;
    inventory: number;
    sku: string;
    title: string;
    lastUpdated: string;
  };
}

// Key for storing inventory mapping in KV store
const INVENTORY_MAPPING_KEY = 'woo-inventory-mapping';

/**
 * Check if Redis is available
 */
function isRedisAvailable(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.NEXT_PUBLIC_KV_REST_API_URL && process.env.NEXT_PUBLIC_KV_REST_API_TOKEN)
  );
}

/**
 * Load inventory mapping from storage
 * Maps WooCommerce product IDs to product slugs
 * 
 * @returns A record mapping product IDs to product slugs
 */
export async function loadInventoryMap(): Promise<InventoryMap> {
  // Use Redis if available
  if (isRedisAvailable()) {
    try {
      // Get all keys with our prefix
      const keys = await redis.keys(`${KEY_PREFIX}*`);
      
      if (keys.length === 0) {
        console.log('No existing WooCommerce inventory mappings found in Redis');
        return {};
      }
      
      // Create a mapping object
      const map: InventoryMap = {};
      
      // Get all values in a single batch operation
      const values = await redis.mget(...keys);
      
      // Populate the mapping object
      keys.forEach((key, index) => {
        const productId = key.replace(KEY_PREFIX, '');
        const productSlug = values[index] as string;
        map[productId] = productSlug;
      });
      
      console.log(`Loaded WooCommerce inventory mapping with ${Object.keys(map).length} entries from Redis`);
      return map;
    } catch (error) {
      console.error('Error loading WooCommerce inventory mapping from Redis:', error);
      console.log('Falling back to in-memory storage');
      return { ...memoryStorage };
    }
  } else {
    // Fallback to in-memory when Redis is not available
    return { ...memoryStorage };
  }
}

/**
 * Save inventory mapping to storage
 * 
 * @param map The inventory mapping to save
 */
export async function saveInventoryMap(map: InventoryMap): Promise<void> {
  // Use Redis if available
  if (isRedisAvailable()) {
    try {
      // Convert map to array of Redis commands
      const pipeline = redis.pipeline();
      
      // First clear existing keys with this prefix
      const existingKeys = await redis.keys(`${KEY_PREFIX}*`);
      if (existingKeys.length > 0) {
        pipeline.del(...existingKeys);
      }
      
      // Set new key-value pairs
      Object.entries(map).forEach(([productId, productSlug]) => {
        pipeline.set(`${KEY_PREFIX}${productId}`, productSlug);
      });
      
      // Execute all commands in a single transaction
      await pipeline.exec();
      
      console.log(`Saved WooCommerce inventory mapping with ${Object.keys(map).length} entries to Redis`);
    } catch (error) {
      console.error('Error saving WooCommerce inventory mapping to Redis:', error);
      console.log('Falling back to in-memory storage');
      
      // Update in-memory storage as fallback
      Object.assign(memoryStorage, map);
    }
  } else {
    // Fallback to in-memory when Redis is not available
    Object.assign(memoryStorage, map);
    console.log(`Saved WooCommerce inventory mapping with ${Object.keys(map).length} entries to memory`);
  }
}

/**
 * Add a mapping between a WooCommerce product ID and a product slug
 * 
 * @param productId The WooCommerce product ID
 * @param productSlug The product slug
 * @returns True if the mapping was added or updated, false if there was an error
 */
export async function addInventoryMapping(productId: string, productSlug: string): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      await redis.set(`${KEY_PREFIX}${productId}`, productSlug);
      console.log(`Added WooCommerce mapping to Redis: ${productId} -> ${productSlug}`);
    } else {
      memoryStorage[productId] = productSlug;
      console.log(`Added WooCommerce mapping to memory: ${productId} -> ${productSlug}`);
    }
    return true;
  } catch (error) {
    console.error('Error adding WooCommerce inventory mapping:', error);
    
    // Try memory as fallback
    try {
      memoryStorage[productId] = productSlug;
      console.log(`Added WooCommerce mapping to memory fallback: ${productId} -> ${productSlug}`);
      return true;
    } catch (memError) {
      console.error('Error adding to memory fallback:', memError);
      return false;
    }
  }
}

/**
 * Get the product slug associated with a WooCommerce product ID
 * 
 * @param productId The WooCommerce product ID
 * @returns The product slug, or null if not found
 */
export async function getProductSlugFromInventory(productId: string): Promise<string | null> {
  try {
    if (isRedisAvailable()) {
      const slug = await redis.get(`${KEY_PREFIX}${productId}`);
      return slug as string || null;
    } else {
      return memoryStorage[productId] || null;
    }
  } catch (error) {
    console.error('Error getting product slug from Redis:', error);
    
    // Try memory as fallback
    try {
      return memoryStorage[productId] || null;
    } catch (memError) {
      console.error('Error getting from memory fallback:', memError);
      return null;
    }
  }
}

/**
 * Batch update multiple WooCommerce inventory mappings
 * 
 * @param mappings An array of product ID to product slug mappings
 * @returns True if all mappings were successfully updated, false otherwise
 */
export async function updateInventoryMappings(
  mappings: Array<{ productId: string; productSlug: string }>
): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      const pipeline = redis.pipeline();
      
      for (const { productId, productSlug } of mappings) {
        pipeline.set(`${KEY_PREFIX}${productId}`, productSlug);
      }
      
      await pipeline.exec();
      console.log(`Updated ${mappings.length} WooCommerce inventory mappings in Redis`);
    } else {
      for (const { productId, productSlug } of mappings) {
        memoryStorage[productId] = productSlug;
      }
      console.log(`Updated ${mappings.length} WooCommerce inventory mappings in memory`);
    }
    
    return true;
  } catch (error) {
    console.error('Error batch updating WooCommerce inventory mappings:', error);
    return false;
  }
}

/**
 * Get all WooCommerce inventory mappings
 * 
 * @returns The complete inventory map
 */
export async function getAllInventoryMappings(): Promise<InventoryMap> {
  return await loadInventoryMap();
}

/**
 * Clear all WooCommerce inventory mappings
 * 
 * @returns True if successfully cleared, false otherwise
 */
export async function clearInventoryMappings(): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      const keys = await redis.keys(`${KEY_PREFIX}*`);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      console.log('Cleared all WooCommerce inventory mappings from Redis');
    }
    
    // Clear memory storage regardless of Redis availability
    Object.keys(memoryStorage).forEach(key => {
      delete memoryStorage[key];
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing WooCommerce inventory mappings:', error);
    return false;
  }
}

/**
 * Map a Shopify product ID to a WooCommerce product ID
 * 
 * @param shopifyId The Shopify product ID
 * @param wooId The WooCommerce product ID
 * @returns True if the mapping was added successfully, false otherwise
 */
export async function mapShopifyToWooId(shopifyId: string, wooId: string): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      // Get existing mappings
      const existingMap = await redis.hgetall(SHOPIFY_TO_WOO_KEY) || {};
      
      // Add new mapping
      existingMap[shopifyId] = wooId;
      
      // Save updated mappings
      await redis.hset(SHOPIFY_TO_WOO_KEY, existingMap);
      
      console.log(`Mapped Shopify ID ${shopifyId} to WooCommerce ID ${wooId} in Redis`);
      return true;
    } else {
      // Fallback to in-memory
      shopifyToWooMemoryStorage[shopifyId] = wooId;
      console.log(`Mapped Shopify ID ${shopifyId} to WooCommerce ID ${wooId} in memory`);
      return true;
    }
  } catch (error) {
    console.error('Error mapping Shopify ID to WooCommerce ID:', error);
    return false;
  }
}

/**
 * Get the WooCommerce ID corresponding to a Shopify ID
 * 
 * @param shopifyId The original Shopify product ID or inventory item ID
 * @returns The corresponding WooCommerce ID, or null if not found
 */
export async function getWooIdFromShopifyId(shopifyId: string): Promise<string | null> {
  try {
    if (isRedisAvailable()) {
      const wooId = await redis.hget(SHOPIFY_TO_WOO_KEY, shopifyId);
      return wooId as string || null;
    } else {
      return shopifyToWooMemoryStorage[shopifyId] || null;
    }
  } catch (error) {
    console.error(`Error getting WooCommerce ID for Shopify ID ${shopifyId}:`, error);
    
    // Try memory as fallback
    try {
      return shopifyToWooMemoryStorage[shopifyId] || null;
    } catch (memError) {
      console.error('Error getting from memory fallback:', memError);
      return null;
    }
  }
}

/**
 * Get all Shopify to WooCommerce ID mappings
 * 
 * @returns Record of Shopify IDs to WooCommerce IDs
 */
export async function getAllShopifyToWooMappings(): Promise<Record<string, string>> {
  try {
    if (isRedisAvailable()) {
      const mappings = await redis.hgetall(SHOPIFY_TO_WOO_KEY);
      return mappings as Record<string, string> || {};
    } else {
      return { ...shopifyToWooMemoryStorage };
    }
  } catch (error) {
    console.error('Error getting all Shopify to WooCommerce mappings:', error);
    return { ...shopifyToWooMemoryStorage };
  }
}

/**
 * Initialize inventory mappings from WooCommerce products
 * This function should be called after initial product import or periodically to refresh the mappings
 * 
 * @param products Array of WooCommerce products with id and slug properties
 * @returns True if successfully initialized, false otherwise
 */
export async function initializeFromProducts(
  products: Array<{ id: string; slug: string; shopifyId?: string }>
): Promise<boolean> {
  try {
    const inventoryMappings: Array<{ productId: string; productSlug: string }> = [];
    const idMappings: Array<{ shopifyId: string; wooId: string }> = [];
    
    for (const product of products) {
      // Add to inventory mappings
      inventoryMappings.push({
        productId: product.id,
        productSlug: product.slug
      });
      
      // If this product has a Shopify ID, add to ID mappings
      if (product.shopifyId) {
        idMappings.push({
          shopifyId: product.shopifyId,
          wooId: product.id
        });
      }
    }
    
    // Update inventory mappings
    await updateInventoryMappings(inventoryMappings);
    
    // Update ID mappings
    for (const { shopifyId, wooId } of idMappings) {
      await mapShopifyToWooId(shopifyId, wooId);
    }
    
    console.log(`Initialized ${inventoryMappings.length} inventory mappings and ${idMappings.length} ID mappings`);
    return true;
  } catch (error) {
    console.error('Error initializing inventory mappings from products:', error);
    return false;
  }
}

/**
 * Get the current inventory mapping
 * 
 * @returns The inventory mapping
 */
export async function getInventoryMapping(): Promise<InventoryMapping> {
  try {
    // Try to get the mapping from Redis
    if (isRedisAvailable()) {
      const allKeys = await redis.keys(`${KEY_PREFIX}*`);
      if (allKeys.length > 0) {
        const mapping: InventoryMapping = {};
        const values = await redis.mget(...allKeys);
        
        allKeys.forEach((key, index) => {
          const productId = key.replace(KEY_PREFIX, '');
          const slug = values[index] as string;
          mapping[productId] = {
            wooId: productId,
            inventory: 0, // Default value
            sku: '', // Default value
            title: slug, // Use slug as title
            lastUpdated: new Date().toISOString()
          };
        });
        
        return mapping;
      }
    }
    
    // Default empty mapping
    return {};
  } catch (error) {
    console.error('Error getting inventory mapping:', error);
    return {};
  }
}

/**
 * Update the inventory mapping
 * 
 * @param mapping The inventory mapping to save
 * @returns True if successful, false otherwise
 */
export async function updateInventoryMapping(mapping: InventoryMapping): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      // First clear existing keys
      const existingKeys = await redis.keys(`${KEY_PREFIX}*`);
      if (existingKeys.length > 0) {
        await redis.del(...existingKeys);
      }
      
      // Add each product mapping
      const pipeline = redis.pipeline();
      for (const [productId, details] of Object.entries(mapping)) {
        pipeline.set(`${KEY_PREFIX}${productId}`, details.title || productId);
      }
      
      await pipeline.exec();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating inventory mapping:', error);
    return false;
  }
} 

/**
 * Validate and transform product ID
 * 
 * This function helps with the migration from Shopify to WooCommerce by:
 * 1. Checking if the ID is a valid WooCommerce ID
 * 2. If not, attempting to map from Shopify ID to WooCommerce ID
 * 3. Returning a normalized ID or the original ID if no mapping found
 * 
 * @param productId The product ID to validate (could be Shopify or WooCommerce ID)
 * @returns A valid WooCommerce product ID or the original ID if no mapping found
 */
export async function validateProductId(productId: string): Promise<string> {
  if (!productId || productId === 'undefined' || productId === 'null') {
    console.warn('Invalid product ID received:', productId);
    return productId; // Return the original ID even if invalid
  }

  // Check if this looks like a Shopify ID (gid://shopify/Product/123456789)
  if (productId.includes('gid://shopify/Product/')) {
    console.log(`Detected Shopify ID: ${productId}, attempting to map to WooCommerce ID`);
    
    // Try to get the WooCommerce ID from our mapping
    const wooId = await getWooIdFromShopifyId(productId);
    
    if (wooId) {
      console.log(`Mapped Shopify ID ${productId} to WooCommerce ID ${wooId}`);
      return wooId;
    } else {
      console.warn(`No mapping found for Shopify ID: ${productId}, using original ID`);
      return productId; // Return the original ID if no mapping found
    }
  }
  
  // If it's a base64 encoded ID like "cG9zdDo2MA==", it might be a WooCommerce ID
  // but we should check if it actually exists in our inventory mapping
  if (productId.includes('=')) {
    const slug = await getProductSlugFromInventory(productId);
    
    if (slug) {
      // We have a mapping for this ID, so it's likely valid
      return productId;
    } else {
      console.warn(`Product ID ${productId} not found in inventory mapping, using as is`);
      // We'll still return the ID and let the GraphQL API handle the validation
      return productId;
    }
  }
  
  // If it's a numeric ID, it's likely a valid WooCommerce product ID
  if (/^\d+$/.test(productId)) {
    return productId;
  }
  
  // For any other format, return as is and let the GraphQL API validate
  return productId;
} 