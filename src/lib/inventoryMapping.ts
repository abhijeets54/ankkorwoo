import { Redis } from '@upstash/redis';

// Type for inventory mapping
type InventoryMap = Record<string, string>;

// Redis key prefix for inventory mappings
const KEY_PREFIX = 'inventory:mapping:';

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
 * Maps inventory_item_ids to product handles
 * 
 * @returns A record mapping inventory_item_ids to product handles
 */
export async function loadInventoryMap(): Promise<InventoryMap> {
  // Use Redis if available
  if (isRedisAvailable()) {
    try {
      // Get all keys with our prefix
      const keys = await redis.keys(`${KEY_PREFIX}*`);
      
      if (keys.length === 0) {
        console.log('No existing inventory mappings found in Redis');
        return {};
      }
      
      // Create a mapping object
      const map: InventoryMap = {};
      
      // Get all values in a single batch operation
      const values = await redis.mget(...keys);
      
      // Populate the mapping object
      keys.forEach((key, index) => {
        const inventoryItemId = key.replace(KEY_PREFIX, '');
        const productHandle = values[index] as string;
        map[inventoryItemId] = productHandle;
      });
      
      console.log(`Loaded inventory mapping with ${Object.keys(map).length} entries from Redis`);
      return map;
    } catch (error) {
      console.error('Error loading inventory mapping from Redis:', error);
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
      Object.entries(map).forEach(([inventoryItemId, productHandle]) => {
        pipeline.set(`${KEY_PREFIX}${inventoryItemId}`, productHandle);
      });
      
      // Execute all commands in a single transaction
      await pipeline.exec();
      
      console.log(`Saved inventory mapping with ${Object.keys(map).length} entries to Redis`);
    } catch (error) {
      console.error('Error saving inventory mapping to Redis:', error);
      console.log('Falling back to in-memory storage');
      
      // Update in-memory storage as fallback
      Object.assign(memoryStorage, map);
    }
  } else {
    // Fallback to in-memory when Redis is not available
    Object.assign(memoryStorage, map);
    console.log(`Saved inventory mapping with ${Object.keys(map).length} entries to memory`);
  }
}

/**
 * Add a mapping between an inventory_item_id and a product handle
 * 
 * @param inventoryItemId The Shopify inventory_item_id
 * @param productHandle The product handle
 * @returns True if the mapping was added or updated, false if there was an error
 */
export async function addInventoryMapping(inventoryItemId: string, productHandle: string): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      await redis.set(`${KEY_PREFIX}${inventoryItemId}`, productHandle);
      console.log(`Added mapping to Redis: ${inventoryItemId} -> ${productHandle}`);
    } else {
      memoryStorage[inventoryItemId] = productHandle;
      console.log(`Added mapping to memory: ${inventoryItemId} -> ${productHandle}`);
    }
    return true;
  } catch (error) {
    console.error('Error adding inventory mapping:', error);
    
    // Try memory as fallback
    try {
      memoryStorage[inventoryItemId] = productHandle;
      console.log(`Added mapping to memory fallback: ${inventoryItemId} -> ${productHandle}`);
      return true;
    } catch (memError) {
      console.error('Error adding to memory fallback:', memError);
      return false;
    }
  }
}

/**
 * Get the product handle associated with an inventory_item_id
 * 
 * @param inventoryItemId The Shopify inventory_item_id
 * @returns The product handle, or null if not found
 */
export async function getProductHandleFromInventory(inventoryItemId: string): Promise<string | null> {
  try {
    if (isRedisAvailable()) {
      const handle = await redis.get(`${KEY_PREFIX}${inventoryItemId}`);
      return handle as string || null;
    } else {
      return memoryStorage[inventoryItemId] || null;
    }
  } catch (error) {
    console.error('Error getting product handle from Redis:', error);
    
    // Try memory as fallback
    try {
      return memoryStorage[inventoryItemId] || null;
    } catch (memError) {
      console.error('Error getting from memory fallback:', memError);
      return null;
    }
  }
}

/**
 * Batch update multiple inventory mappings
 * 
 * @param mappings An array of inventory_item_id to product handle mappings
 * @returns True if all mappings were successfully updated, false otherwise
 */
export async function updateInventoryMappings(
  mappings: Array<{ inventoryItemId: string; productHandle: string }>
): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      const pipeline = redis.pipeline();
      
      for (const { inventoryItemId, productHandle } of mappings) {
        pipeline.set(`${KEY_PREFIX}${inventoryItemId}`, productHandle);
      }
      
      await pipeline.exec();
      console.log(`Updated ${mappings.length} inventory mappings in Redis`);
    } else {
      for (const { inventoryItemId, productHandle } of mappings) {
        memoryStorage[inventoryItemId] = productHandle;
      }
      console.log(`Updated ${mappings.length} inventory mappings in memory`);
    }
    return true;
  } catch (error) {
    console.error('Error updating inventory mappings in Redis:', error);
    
    // Try memory as fallback
    try {
      for (const { inventoryItemId, productHandle } of mappings) {
        memoryStorage[inventoryItemId] = productHandle;
      }
      console.log(`Updated ${mappings.length} inventory mappings in memory fallback`);
      return true;
    } catch (memError) {
      console.error('Error updating in memory fallback:', memError);
      return false;
    }
  }
}

/**
 * Get all inventory mappings
 * 
 * @returns The complete inventory mapping
 */
export async function getAllInventoryMappings(): Promise<InventoryMap> {
  return await loadInventoryMap();
}

/**
 * Clear all inventory mappings (use with caution)
 * 
 * @returns True if the mappings were successfully cleared, false otherwise
 */
export async function clearInventoryMappings(): Promise<boolean> {
  try {
    if (isRedisAvailable()) {
      const keys = await redis.keys(`${KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      console.log('Cleared all inventory mappings from Redis');
    } else {
      // Clear in-memory storage
      Object.keys(memoryStorage).forEach(key => {
        delete memoryStorage[key];
      });
      console.log('Cleared all inventory mappings from memory');
    }
    return true;
  } catch (error) {
    console.error('Error clearing inventory mappings:', error);
    return false;
  }
} 