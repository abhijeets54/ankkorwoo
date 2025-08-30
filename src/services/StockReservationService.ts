import { prisma } from '@/lib/database';
import { StockReservation, ReservationStatus, Prisma } from '@prisma/client';
import { Redis } from '@upstash/redis';

// Initialize Redis
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export interface ReservationResult {
  success: boolean;
  reservation?: StockReservation;
  error?: string;
  availableStock?: number;
}

export interface StockCheckResult {
  success: boolean;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  error?: string;
}

export class StockReservationService {
  private readonly RESERVATION_DURATION_MINUTES = 15;
  private readonly MAX_RESERVATIONS_PER_USER = 10;
  private readonly LOCK_TIMEOUT_SECONDS = 30;

  /**
   * Create stock reservation with distributed locking
   */
  async createReservation(
    productId: string,
    quantity: number,
    userId?: string,
    sessionId?: string,
    variationId?: string
  ): Promise<ReservationResult> {
    if (!userId && !sessionId) {
      return { success: false, error: 'Either userId or sessionId is required' };
    }

    const lockKey = `lock:product:${productId}${variationId ? `:${variationId}` : ''}`;
    
    // Acquire distributed lock
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      return { 
        success: false, 
        error: 'Product is being updated by another user, please try again' 
      };
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Check user reservation limits
        if (userId) {
          const userReservationCount = await tx.stockReservation.count({
            where: {
              userId,
              status: ReservationStatus.ACTIVE
            }
          });

          if (userReservationCount >= this.MAX_RESERVATIONS_PER_USER) {
            return {
              success: false,
              error: `Maximum ${this.MAX_RESERVATIONS_PER_USER} active reservations allowed`
            };
          }
        }

        // Check available stock
        const stockCheck = await this.checkAvailableStockInternal(
          productId, 
          variationId, 
          tx
        );

        if (!stockCheck.success) {
          return {
            success: false,
            error: 'Failed to check stock availability',
            availableStock: 0
          };
        }

        if (stockCheck.availableStock < quantity) {
          return {
            success: false,
            error: `Only ${stockCheck.availableStock} items available`,
            availableStock: stockCheck.availableStock
          };
        }

        // Create reservation
        const expiresAt = new Date(
          Date.now() + this.RESERVATION_DURATION_MINUTES * 60 * 1000
        );

        const reservation = await tx.stockReservation.create({
          data: {
            productId,
            variationId,
            quantity,
            userId,
            sessionId,
            status: ReservationStatus.ACTIVE,
            expiresAt
          }
        });

        // Update product stock cache
        await this.updateProductStockCache(productId, variationId, tx);

        // Log the reservation
        await this.logStockChange(
          productId,
          variationId,
          'reservation_created',
          -quantity,
          stockCheck.availableStock,
          stockCheck.availableStock - quantity,
          'Stock reserved for cart',
          userId,
          sessionId,
          reservation.id,
          tx
        );

        return {
          success: true,
          reservation
        };
      });
    } finally {
      // Always release the lock
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Confirm reservation (convert to sale)
   */
  async confirmReservation(reservationId: string): Promise<boolean> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const reservation = await tx.stockReservation.findUnique({
          where: { id: reservationId }
        });

        if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
          return false;
        }

        // Check if reservation is expired
        if (reservation.expiresAt < new Date()) {
          await tx.stockReservation.update({
            where: { id: reservationId },
            data: {
              status: ReservationStatus.EXPIRED,
              releasedAt: new Date()
            }
          });
          return false;
        }

        // Confirm reservation
        await tx.stockReservation.update({
          where: { id: reservationId },
          data: {
            status: ReservationStatus.CONFIRMED,
            confirmedAt: new Date()
          }
        });

        // Update product stock cache
        await this.updateProductStockCache(
          reservation.productId, 
          reservation.variationId, 
          tx
        );

        // Log the confirmation
        await this.logStockChange(
          reservation.productId,
          reservation.variationId,
          'reservation_confirmed',
          -reservation.quantity,
          0, // We don't have previous stock here, will be calculated
          0, // New stock will be calculated
          'Reservation confirmed - stock permanently allocated',
          reservation.userId,
          reservation.sessionId,
          null,
          tx,
          { reservationId }
        );

        return true;
      });

      return result;
    } catch (error) {
      console.error('Error confirming reservation:', error);
      return false;
    }
  }

  /**
   * Release reservation (cancel)
   */
  async releaseReservation(reservationId: string): Promise<boolean> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const reservation = await tx.stockReservation.findUnique({
          where: { id: reservationId }
        });

        if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
          return false;
        }

        // Release reservation
        await tx.stockReservation.update({
          where: { id: reservationId },
          data: {
            status: ReservationStatus.RELEASED,
            releasedAt: new Date()
          }
        });

        // Update product stock cache
        await this.updateProductStockCache(
          reservation.productId, 
          reservation.variationId, 
          tx
        );

        // Log the release
        await this.logStockChange(
          reservation.productId,
          reservation.variationId,
          'reservation_released',
          reservation.quantity,
          0, // Previous stock will be calculated
          0, // New stock will be calculated
          'Reservation released - stock returned to available pool',
          reservation.userId,
          reservation.sessionId,
          null,
          tx,
          { reservationId }
        );

        return true;
      });

      return result;
    } catch (error) {
      console.error('Error releasing reservation:', error);
      return false;
    }
  }

  /**
   * Check available stock for a product
   */
  async checkAvailableStock(
    productId: string, 
    variationId?: string
  ): Promise<StockCheckResult> {
    try {
      return await this.checkAvailableStockInternal(productId, variationId);
    } catch (error) {
      console.error('Error checking available stock:', error);
      return {
        success: false,
        totalStock: 0,
        availableStock: 0,
        reservedStock: 0,
        error: 'Failed to check stock availability'
      };
    }
  }

  /**
   * Internal method for checking stock within transaction
   */
  private async checkAvailableStockInternal(
    productId: string,
    variationId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<StockCheckResult> {
    const client = tx || prisma;

    // Get total stock from WooCommerce/product stock table
    const productStock = await client.productStock.findFirst({
      where: {
        productId,
        variationId: variationId || null
      }
    });

    if (!productStock) {
      // Fetch from WooCommerce API as fallback
      const wooStock = await this.fetchStockFromWooCommerce(productId, variationId);
      if (wooStock === null) {
        return {
          success: false,
          totalStock: 0,
          availableStock: 0,
          reservedStock: 0,
          error: 'Product not found'
        };
      }

      return {
        success: true,
        totalStock: wooStock,
        availableStock: wooStock,
        reservedStock: 0
      };
    }

    // Calculate reserved stock from active reservations
    const reservedResult = await client.stockReservation.aggregate({
      where: {
        productId,
        variationId,
        status: ReservationStatus.ACTIVE,
        expiresAt: {
          gt: new Date() // Only count non-expired reservations
        }
      },
      _sum: {
        quantity: true
      }
    });

    const reservedStock = reservedResult._sum.quantity || 0;
    const availableStock = Math.max(0, productStock.totalStock - reservedStock);

    return {
      success: true,
      totalStock: productStock.totalStock,
      availableStock,
      reservedStock
    };
  }

  /**
   * Get user's active reservations
   */
  async getUserActiveReservations(
    userId?: string, 
    sessionId?: string
  ): Promise<StockReservation[]> {
    if (!userId && !sessionId) {
      return [];
    }

    try {
      const reservations = await prisma.stockReservation.findMany({
        where: {
          OR: [
            userId ? { userId } : {},
            sessionId ? { sessionId } : {}
          ].filter(obj => Object.keys(obj).length > 0),
          status: ReservationStatus.ACTIVE,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reservations;
    } catch (error) {
      console.error('Error fetching user reservations:', error);
      return [];
    }
  }

  /**
   * Cleanup expired reservations
   */
  async cleanupExpiredReservations(): Promise<number> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Find expired reservations
        const expiredReservations = await tx.stockReservation.findMany({
          where: {
            status: ReservationStatus.ACTIVE,
            expiresAt: {
              lt: new Date()
            }
          }
        });

        if (expiredReservations.length === 0) {
          return 0;
        }

        // Mark as expired
        await tx.stockReservation.updateMany({
          where: {
            id: {
              in: expiredReservations.map(r => r.id)
            }
          },
          data: {
            status: ReservationStatus.EXPIRED,
            releasedAt: new Date()
          }
        });

        // Update stock cache for affected products
        const affectedProducts = new Set<string>();
        expiredReservations.forEach(r => {
          const key = `${r.productId}${r.variationId ? `:${r.variationId}` : ''}`;
          affectedProducts.add(key);
        });

        for (const productKey of affectedProducts) {
          const [productId, variationId] = productKey.split(':');
          await this.updateProductStockCache(productId, variationId || undefined, tx);
        }

        return expiredReservations.length;
      });

      console.log(`Cleaned up ${result} expired reservations`);
      return result;
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
      return 0;
    }
  }

  /**
   * Acquire distributed lock with database fallback
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    if (!redis) {
      // Fallback to database-based locking for production safety
      console.warn('Redis not available, using database fallback lock');
      return await this.acquireDatabaseLock(lockKey);
    }

    try {
      const result = await redis.set(lockKey, 'locked', {
        ex: this.LOCK_TIMEOUT_SECONDS,
        nx: true // Only set if key doesn't exist
      });
      
      return result === 'OK';
    } catch (error) {
      console.error('Error acquiring Redis lock, falling back to database:', error);
      return await this.acquireDatabaseLock(lockKey);
    }
  }

  /**
   * Database-based locking fallback using PostgreSQL advisory locks
   */
  private async acquireDatabaseLock(lockKey: string): Promise<boolean> {
    try {
      // Use PostgreSQL advisory lock with hash of lock key
      const lockId = this.stringToLockId(lockKey);
      const result = await prisma.$queryRaw<[{pg_try_advisory_lock: boolean}]>`
        SELECT pg_try_advisory_lock(${lockId}) as pg_try_advisory_lock
      `;
      
      const acquired = result[0]?.pg_try_advisory_lock || false;
      
      if (acquired) {
        // Set a timeout to release the lock automatically
        setTimeout(() => {
          this.releaseDatabaseLock(lockKey).catch(err => 
            console.error('Failed to auto-release database lock:', err)
          );
        }, this.LOCK_TIMEOUT_SECONDS * 1000);
      }
      
      return acquired;
    } catch (error) {
      console.error('Error acquiring database lock:', error);
      return false;
    }
  }

  /**
   * Release database lock
   */
  private async releaseDatabaseLock(lockKey: string): Promise<void> {
    try {
      const lockId = this.stringToLockId(lockKey);
      await prisma.$queryRaw`
        SELECT pg_advisory_unlock(${lockId})
      `;
    } catch (error) {
      console.error('Error releasing database lock:', error);
    }
  }

  /**
   * Convert string to numeric lock ID for PostgreSQL advisory locks
   */
  private stringToLockId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    if (!redis) {
      // Use database lock release as fallback
      await this.releaseDatabaseLock(lockKey);
      return;
    }

    try {
      await redis.del(lockKey);
    } catch (error) {
      console.error('Error releasing Redis lock, trying database fallback:', error);
      await this.releaseDatabaseLock(lockKey);
    }
  }

  /**
   * Update product stock cache
   */
  private async updateProductStockCache(
    productId: string,
    variationId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || prisma;

    try {
      const stockCheck = await this.checkAvailableStockInternal(
        productId, 
        variationId, 
        client
      );

      if (stockCheck.success) {
        // First, try to find existing stock record
        const existingStock = await client.productStock.findFirst({
          where: {
            productId,
            variationId: variationId || null
          }
        });

        if (existingStock) {
          // Update existing record
          await client.productStock.update({
            where: { id: existingStock.id },
            data: {
              availableStock: stockCheck.availableStock,
              reservedStock: stockCheck.reservedStock,
              lastSyncAt: new Date(),
              syncSource: 'reservation_update'
            }
          });
        } else {
          // Create new record
          await client.productStock.create({
            data: {
              productId,
              variationId: variationId || null,
              totalStock: stockCheck.totalStock,
              availableStock: stockCheck.availableStock,
              reservedStock: stockCheck.reservedStock,
              lastSyncAt: new Date(),
              syncSource: 'reservation_create'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating product stock cache:', error);
    }
  }

  /**
   * Log stock changes for audit trail
   */
  private async logStockChange(
    productId: string,
    variationId: string | null | undefined,
    changeType: string,
    quantity: number,
    previousStock: number,
    newStock: number,
    reason: string,
    userId?: string | null,
    sessionId?: string | null,
    orderId?: string | null,
    tx?: Prisma.TransactionClient,
    metadata?: Record<string, any>
  ): Promise<void> {
    const client = tx || prisma;

    try {
      await client.stockAuditLog.create({
        data: {
          productId,
          variationId: variationId || null,
          changeType,
          quantity,
          previousStock,
          newStock,
          reason,
          userId,
          sessionId,
          orderId,
          metadata
        }
      });
    } catch (error) {
      console.error('Error logging stock change:', error);
    }
  }

  /**
   * Fetch stock from WooCommerce API
   */
  private async fetchStockFromWooCommerce(
    productId: string, 
    variationId?: string
  ): Promise<number | null> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ankkorwoo.vercel.app';
      const url = `${baseUrl}/api/products/${productId}/stock${variationId ? `?variation_id=${variationId}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.stockQuantity || 0;
    } catch (error) {
      console.error('Error fetching stock from WooCommerce:', error);
      return null;
    }
  }
}