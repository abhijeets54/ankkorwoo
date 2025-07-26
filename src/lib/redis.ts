import { Redis } from '@upstash/redis';

// Initialize Redis client with support for both Upstash Redis and Vercel KV variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 
       process.env.NEXT_PUBLIC_KV_REST_API_URL || 
       '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 
         process.env.NEXT_PUBLIC_KV_REST_API_TOKEN || 
         '',
});

// Cache TTL defaults (in seconds)
export const CACHE_TTL = {
  SHORT: 60 * 5,           // 5 minutes
  MEDIUM: 60 * 60,         // 1 hour
  LONG: 60 * 60 * 24,      // 24 hours
  WEEK: 60 * 60 * 24 * 7   // 1 week
};

/**
 * Check if Redis is available by checking all possible env var combinations
 */
export function isRedisAvailable(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.NEXT_PUBLIC_KV_REST_API_URL && process.env.NEXT_PUBLIC_KV_REST_API_TOKEN)
  );
}

/**
 * Get a value from Redis
 * @param key The Redis key
 * @returns The value, or null if not found
 */
export async function get<T = any>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;
  
  try {
    const value = await redis.get(key);
    return value as T || null;
  } catch (error) {
    console.error(`Redis get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in Redis with optional expiration
 * @param key The Redis key
 * @param value The value to store
 * @param ttl Time to live in seconds (optional)
 * @returns True if successful, false otherwise
 */
export async function set(key: string, value: any, ttl?: number): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  
  try {
    if (ttl) {
      await redis.setex(key, ttl, value);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`Redis set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete a key from Redis
 * @param key The Redis key to delete
 * @returns True if successful, false otherwise
 */
export async function del(key: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Redis delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Cache a function result in Redis
 * @param key The Redis key
 * @param fn The function to execute and cache its result
 * @param ttl Time to live in seconds (optional)
 * @returns The function result, either from cache or freshly executed
 */
export async function cache<T>(
  key: string, 
  fn: () => Promise<T>, 
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  if (!isRedisAvailable()) {
    // If Redis is not available, just execute the function
    return await fn();
  }
  
  try {
    // Try to get from cache first
    const cached = await redis.get(key);
    
    if (cached !== null) {
      console.log(`Cache hit for key: ${key}`);
      return JSON.parse(cached as string) as T;
    }
    
    // Not in cache, execute the function
    console.log(`Cache miss for key: ${key}, fetching fresh data`);
    const result = await fn();
    
    // Cache the result
    await redis.setex(key, ttl, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(`Redis cache error for key ${key}:`, error);
    // If there's an error with Redis, fall back to just executing the function
    return await fn();
  }
}

/**
 * Increment a counter in Redis
 * @param key The Redis key
 * @param ttl Optional TTL to set if the key doesn't exist
 * @returns The new value after incrementing
 */
export async function incr(key: string, ttl?: number): Promise<number> {
  if (!isRedisAvailable()) return 1; // Pretend it's the first increment
  
  try {
    const newValue = await redis.incr(key);
    
    // Set expiration if provided and this is a new key (value === 1)
    if (ttl && newValue === 1) {
      await redis.expire(key, ttl);
    }
    
    return newValue;
  } catch (error) {
    console.error(`Redis increment error for key ${key}:`, error);
    return 1; // Fallback to allowing the action
  }
}

/**
 * Implemented basic rate limiting
 * @param identifier The identifier to rate limit (e.g., IP address or user ID)
 * @param prefix Key prefix to namespace rate limits for different features
 * @param limit Max number of requests allowed within the time window
 * @param window Time window in seconds
 * @returns An object with allowed (boolean) and remaining (number) properties
 */
export async function rateLimit(
  identifier: string,
  prefix: string = 'ratelimit',
  limit: number = 60,
  window: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  if (!isRedisAvailable()) {
    // If Redis is not available, always allow requests
    return { allowed: true, remaining: limit, resetAt: new Date(Date.now() + window * 1000) };
  }
  
  const key = `${prefix}:${identifier}`;
  
  try {
    const currentRequests = await redis.incr(key);
    
    // Set expiration on first request
    if (currentRequests === 1) {
      await redis.expire(key, window);
    }
    
    const ttl = await redis.ttl(key);
    const resetAt = new Date(Date.now() + ttl * 1000);
    const remaining = Math.max(0, limit - currentRequests);
    const allowed = currentRequests <= limit;
    
    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error(`Redis rate limit error for ${identifier}:`, error);
    // If there's an error with Redis, default to allowing the request
    return { allowed: true, remaining: 1, resetAt: new Date(Date.now() + window * 1000) };
  }
}

// Export the Redis client for advanced operations
export default redis; 