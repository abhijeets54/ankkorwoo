import { Redis } from '@upstash/redis';

// Initialize Redis
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Reservation configuration
const RESERVATION_CONFIG = {
  DURATION_MINUTES: 15, // How long to hold items
  CLEANUP_INTERVAL: 60, // Clean up expired reservations every 60 seconds
  MAX_RESERVATIONS_PER_USER: 10 // Prevent abuse
};

export interface StockReservation {
  id: string;
  productId: string;
  variationId?: string;
  quantity: number;
  userId: string; // or session ID
  reservedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'confirmed';
  cartId?: string;
}

export interface ReservationResult {
  success: boolean;
  reservation?: StockReservation;
  error?: string;
  availableStock?: number;
}

// Generate unique reservation ID
function generateReservationId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Get reservation key for Redis
function getReservationKey(productId: string, variationId?: string): string {
  return variationId 
    ? `reservation:product:${productId}:variation:${variationId}`
    : `reservation:product:${productId}`;
}

// Get user reservations key
function getUserReservationsKey(userId: string): string {
  return `user_reservations:${userId}`;
}

// Create a stock reservation
export async function createStockReservation(
  productId: string,
  quantity: number,
  userId: string,
  variationId?: string,
  cartId?: string
): Promise<ReservationResult> {
  if (!redis) {
    return { success: false, error: 'Reservation service unavailable' };
  }

  try {
    // Check if user has too many active reservations
    const userReservations = await getUserActiveReservations(userId);
    if (userReservations.length >= RESERVATION_CONFIG.MAX_RESERVATIONS_PER_USER) {
      return { success: false, error: 'Too many active reservations' };
    }

    // Get current stock and existing reservations
    const stockCheck = await checkAvailableStock(productId, variationId);
    if (!stockCheck.success || (stockCheck.availableStock || 0) < quantity) {
      return { 
        success: false, 
        error: 'Insufficient stock available',
        availableStock: stockCheck.availableStock 
      };
    }

    // Create reservation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_CONFIG.DURATION_MINUTES * 60 * 1000);
    
    const reservation: StockReservation = {
      id: generateReservationId(),
      productId,
      variationId,
      quantity,
      userId,
      reservedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active',
      cartId
    };

    // Store reservation in Redis with TTL
    const reservationKey = `${getReservationKey(productId, variationId)}:${reservation.id}`;
    await redis.set(
      reservationKey, 
      reservation, 
      { ex: RESERVATION_CONFIG.DURATION_MINUTES * 60 }
    );

    // Add to user's reservations list
    const userKey = getUserReservationsKey(userId);
    await redis.sadd(userKey, reservation.id);
    await redis.expire(userKey, RESERVATION_CONFIG.DURATION_MINUTES * 60);

    console.log(`Created stock reservation: ${reservation.id} for product ${productId} (${quantity} items)`);

    return { success: true, reservation };

  } catch (error) {
    console.error('Error creating stock reservation:', error);
    return { success: false, error: 'Failed to create reservation' };
  }
}

// Check available stock (total - confirmed sales - active reservations)
export async function checkAvailableStock(
  productId: string, 
  variationId?: string
): Promise<{ success: boolean; availableStock?: number; totalStock?: number; reservedStock?: number }> {
  if (!redis) {
    return { success: false };
  }

  try {
    // Get actual stock from WooCommerce (you'd implement this)
    const totalStock = await getTotalStockFromWooCommerce(productId, variationId);
    if (totalStock === null) {
      return { success: false };
    }

    // Get all active reservations for this product
    const reservedStock = await getReservedStock(productId, variationId);
    
    const availableStock = Math.max(0, totalStock - reservedStock);

    return { 
      success: true, 
      availableStock, 
      totalStock, 
      reservedStock 
    };

  } catch (error) {
    console.error('Error checking available stock:', error);
    return { success: false };
  }
}

// Get total reserved stock for a product
async function getReservedStock(productId: string, variationId?: string): Promise<number> {
  if (!redis) return 0;

  try {
    const pattern = `${getReservationKey(productId, variationId)}:*`;
    const keys = await redis.keys(pattern);
    
    let totalReserved = 0;
    for (const key of keys) {
      const reservation = await redis.get(key) as StockReservation;
      if (reservation && reservation.status === 'active') {
        totalReserved += reservation.quantity;
      }
    }

    return totalReserved;
  } catch (error) {
    console.error('Error getting reserved stock:', error);
    return 0;
  }
}

// Get user's active reservations
export async function getUserActiveReservations(userId: string): Promise<StockReservation[]> {
  if (!redis) return [];

  try {
    const userKey = getUserReservationsKey(userId);
    const reservationIds = await redis.smembers(userKey);
    
    const reservations: StockReservation[] = [];
    for (const id of reservationIds) {
      // Find the reservation by scanning all product keys
      const keys = await redis.keys(`reservation:product:*:${id}`);
      for (const key of keys) {
        const reservation = await redis.get(key) as StockReservation;
        if (reservation && reservation.status === 'active') {
          reservations.push(reservation);
        }
      }
    }

    return reservations;
  } catch (error) {
    console.error('Error getting user reservations:', error);
    return [];
  }
}

// Confirm reservation (convert to sale)
export async function confirmReservation(reservationId: string): Promise<boolean> {
  if (!redis) return false;

  try {
    // Find and update reservation
    const keys = await redis.keys(`reservation:product:*:${reservationId}`);
    for (const key of keys) {
      const reservation = await redis.get(key) as StockReservation;
      if (reservation) {
        reservation.status = 'confirmed';
        await redis.set(key, reservation, { ex: 86400 }); // Keep for 24 hours for records
        console.log(`Confirmed reservation: ${reservationId}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error confirming reservation:', error);
    return false;
  }
}

// Release reservation (cancel or expire)
export async function releaseReservation(reservationId: string): Promise<boolean> {
  if (!redis) return false;

  try {
    // Find and remove reservation
    const keys = await redis.keys(`reservation:product:*:${reservationId}`);
    for (const key of keys) {
      await redis.del(key);
      console.log(`Released reservation: ${reservationId}`);
    }

    return true;
  } catch (error) {
    console.error('Error releasing reservation:', error);
    return false;
  }
}

// Placeholder for getting actual stock from WooCommerce
async function getTotalStockFromWooCommerce(productId: string, variationId?: string): Promise<number | null> {
  // This would make an API call to your stock endpoint
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ankkorwoo.vercel.app';
    const url = `${baseUrl}/api/products/${productId}/stock${variationId ? `?variation_id=${variationId}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return data.stockQuantity || 0;
  } catch (error) {
    console.error('Error fetching stock from WooCommerce:', error);
    return null;
  }
}

// Clean up expired reservations (run periodically)
export async function cleanupExpiredReservations(): Promise<number> {
  if (!redis) return 0;

  try {
    const keys = await redis.keys('reservation:product:*');
    let cleanedUp = 0;

    for (const key of keys) {
      const reservation = await redis.get(key) as StockReservation;
      if (reservation && new Date(reservation.expiresAt) < new Date()) {
        await redis.del(key);
        cleanedUp++;
      }
    }

    console.log(`Cleaned up ${cleanedUp} expired reservations`);
    return cleanedUp;
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    return 0;
  }
}
