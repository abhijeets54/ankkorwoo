import { prisma } from '@/lib/database';
import { Cart, CartItem, CartStatus, Prisma } from '@prisma/client';
import { Redis } from '@upstash/redis';

// Initialize Redis
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export interface CartItemInput {
  productId: string;
  variationId?: string;
  quantity: number;
  price: number;
  name: string;
  imageUrl?: string;
  attributes?: Record<string, any>;
}

export interface CartWithItems extends Cart {
  items: CartItem[];
}

export class CartService {
  
  /**
   * Get or create cart for user/session with atomic operation
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<CartWithItems> {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    // Retry mechanism for race condition handling
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      
      try {
        // First, try to find existing active cart (outside transaction)
        let cart = await prisma.cart.findFirst({
          where: {
            OR: [
              userId ? { userId, status: CartStatus.ACTIVE } : {},
              sessionId ? { sessionId, status: CartStatus.ACTIVE } : {}
            ].filter(obj => Object.keys(obj).length > 0)
          },
          include: {
            items: true
          }
        });

        if (cart) {
          return cart;
        }

        // If no cart exists, try to create one
        try {
          cart = await prisma.cart.create({
            data: {
              userId,
              sessionId,
              status: CartStatus.ACTIVE,
              expiresAt: sessionId ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null, // 7 days for guest carts
            },
            include: {
              items: true
            }
          });
          
          return cart;
        } catch (error) {
          // If creation fails due to unique constraint (race condition), retry
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            console.log(`Cart creation conflict, retrying (attempt ${attempt}/${maxRetries})`);
            
            if (attempt >= maxRetries) {
              // On final attempt, try once more to find existing cart
              cart = await prisma.cart.findFirst({
                where: {
                  OR: [
                    userId ? { userId, status: CartStatus.ACTIVE } : {},
                    sessionId ? { sessionId, status: CartStatus.ACTIVE } : {}
                  ].filter(obj => Object.keys(obj).length > 0)
                },
                include: {
                  items: true
                }
              });
              
              if (cart) {
                return cart;
              }
              
              throw new Error(`Failed to create or find cart after ${maxRetries} attempts`);
            }
            
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
            continue;
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (attempt >= maxRetries) {
          throw error;
        }
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }
    }
    
    throw new Error(`Failed to create or find cart after ${maxRetries} attempts`);
  }

  /**
   * Add item to cart with race condition protection
   */
  async addToCart(
    cartId: string, 
    itemData: CartItemInput, 
    reservationId?: string
  ): Promise<CartItem> {
    // Retry mechanism for race condition handling (outside transaction)
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Verify cart exists
          const cart = await tx.cart.findUnique({
            where: { id: cartId }
          });

          if (!cart) {
            throw new Error('Cart not found');
          }

          // Check if item already exists
          const existingItem = await tx.cartItem.findFirst({
            where: {
              cartId,
              productId: itemData.productId,
              variationId: itemData.variationId || null
            }
          });

          let cartItem: CartItem;
          
          if (existingItem) {
            // Update existing item quantity
            cartItem = await tx.cartItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: existingItem.quantity + itemData.quantity,
                price: itemData.price, // Update to latest price
                updatedAt: new Date(),
                reservationId
              }
            });
          } else {
            // Create new cart item
            cartItem = await tx.cartItem.create({
              data: {
                cartId,
                productId: itemData.productId,
                variationId: itemData.variationId,
                quantity: itemData.quantity,
                price: itemData.price,
                name: itemData.name,
                imageUrl: itemData.imageUrl,
                attributes: itemData.attributes,
                reservationId
              }
            });
          }

          // Update cart timestamp
          await tx.cart.update({
            where: { id: cartId },
            data: { updatedAt: new Date() }
          });

          return cartItem;
        });
        
        // Transaction completed successfully, update cache  
        await this.updateCartCache(cartId);
        return result;
      } catch (error) {
        // If it's a unique constraint violation and we haven't exceeded retries, try again
        if (error instanceof Prisma.PrismaClientKnownRequestError && 
            (error.code === 'P2002' || error.code === 'P2010') && 
            attempt < maxRetries) {
          console.log(`Cart item creation conflict, retrying (attempt ${attempt}/${maxRetries}):`, error.code, error.meta);
          // Wait a small random amount to reduce contention
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
          continue;
        }
        
        // For other errors or if we've exceeded retries, throw
        throw error;
      }
    }
    
    throw new Error(`Failed to add item to cart after ${maxRetries} attempts`);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(
    cartItemId: string, 
    quantity: number
  ): Promise<CartItem | null> {
    if (quantity <= 0) {
      return await this.removeCartItem(cartItemId);
    }

    return await prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.update({
        where: { id: cartItemId },
        data: { 
          quantity,
          updatedAt: new Date()
        }
      });

      // Update cart timestamp
      await tx.cart.update({
        where: { id: cartItem.cartId },
        data: { updatedAt: new Date() }
      });

      // Update cache
      await this.updateCartCache(cartItem.cartId);

      return cartItem;
    });
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(cartItemId: string): Promise<null> {
    return await prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findUnique({
        where: { id: cartItemId }
      });

      if (!cartItem) {
        return null;
      }

      await tx.cartItem.delete({
        where: { id: cartItemId }
      });

      // Update cart timestamp
      await tx.cart.update({
        where: { id: cartItem.cartId },
        data: { updatedAt: new Date() }
      });

      // Update cache
      await this.updateCartCache(cartItem.cartId);

      return null;
    });
  }

  /**
   * Clear entire cart
   */
  async clearCart(cartId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: { cartId }
      });

      await tx.cart.update({
        where: { id: cartId },
        data: { updatedAt: new Date() }
      });

      // Clear cache
      await this.clearCartCache(cartId);
    });
  }

  /**
   * Get cart with items
   */
  async getCartWithItems(cartId: string): Promise<CartWithItems | null> {
    // Try cache first
    if (redis) {
      try {
        const cached = await redis.get(`cart:${cartId}`);
        if (cached && typeof cached === 'object') {
          return cached as CartWithItems;
        }
      } catch (error) {
        console.warn('Redis cache read failed:', error);
      }
    }

    // Fallback to database
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (cart) {
      // Update cache
      await this.updateCartCache(cartId, cart);
    }

    return cart;
  }

  /**
   * Convert cart to order (mark as converted)
   */
  async convertCart(cartId: string, orderId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.cart.update({
        where: { id: cartId },
        data: {
          status: CartStatus.CONVERTED,
          convertedAt: new Date()
        }
      });

      // Clear cache
      await this.clearCartCache(cartId);
    });
  }

  /**
   * Cleanup expired carts (run via cron)
   */
  async cleanupExpiredCarts(): Promise<number> {
    const result = await prisma.cart.updateMany({
      where: {
        status: CartStatus.ACTIVE,
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: CartStatus.EXPIRED
      }
    });

    return result.count;
  }

  /**
   * Merge guest cart with user cart on login
   */
  async mergeGuestCartWithUserCart(
    sessionId: string, 
    userId: string
  ): Promise<CartWithItems> {
    return await prisma.$transaction(async (tx) => {
      // Get guest cart
      const guestCart = await tx.cart.findFirst({
        where: {
          sessionId,
          status: CartStatus.ACTIVE
        },
        include: { items: true }
      });

      if (!guestCart || guestCart.items.length === 0) {
        // No guest cart, just get or create user cart
        return await this.getOrCreateCart(userId);
      }

      // Get or create user cart
      let userCart = await tx.cart.findFirst({
        where: {
          userId,
          status: CartStatus.ACTIVE
        },
        include: { items: true }
      });

      if (!userCart) {
        userCart = await tx.cart.create({
          data: {
            userId,
            status: CartStatus.ACTIVE
          },
          include: { items: true }
        });
      }

      // Merge items from guest cart to user cart
      for (const guestItem of guestCart.items) {
        const existingUserItem = await tx.cartItem.findFirst({
          where: {
            cartId: userCart.id,
            productId: guestItem.productId,
            variationId: guestItem.variationId || null
          }
        });

        if (existingUserItem) {
          // Update quantity
          await tx.cartItem.update({
            where: { id: existingUserItem.id },
            data: {
              quantity: existingUserItem.quantity + guestItem.quantity
            }
          });
        } else {
          // Move item to user cart
          await tx.cartItem.update({
            where: { id: guestItem.id },
            data: { cartId: userCart.id }
          });
        }
      }

      // Mark guest cart as converted
      await tx.cart.update({
        where: { id: guestCart.id },
        data: { status: CartStatus.CONVERTED }
      });

      // Get updated user cart
      const updatedUserCart = await tx.cart.findUnique({
        where: { id: userCart.id },
        include: { items: true }
      });

      // Update cache
      await this.updateCartCache(userCart.id, updatedUserCart!);
      await this.clearCartCache(guestCart.id);

      return updatedUserCart!;
    });
  }

  /**
   * Update cart cache
   */
  private async updateCartCache(
    cartId: string, 
    cartData?: CartWithItems
  ): Promise<void> {
    if (!redis) return;

    try {
      if (!cartData) {
        cartData = await prisma.cart.findUnique({
          where: { id: cartId },
          include: { items: true }
        }) as CartWithItems;
      }

      if (cartData) {
        await redis.set(`cart:${cartId}`, cartData, { ex: 3600 }); // 1 hour cache
      }
    } catch (error) {
      console.warn('Failed to update cart cache:', error);
    }
  }

  /**
   * Clear cart cache
   */
  private async clearCartCache(cartId: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(`cart:${cartId}`);
    } catch (error) {
      console.warn('Failed to clear cart cache:', error);
    }
  }

  /**
   * Get cart statistics
   */
  async getCartStats(cartId: string): Promise<{
    itemCount: number;
    subtotal: number;
    uniqueProducts: number;
  }> {
    const cart = await this.getCartWithItems(cartId);
    
    if (!cart) {
      return { itemCount: 0, subtotal: 0, uniqueProducts: 0 };
    }

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const uniqueProducts = cart.items.length;

    return {
      itemCount,
      subtotal,
      uniqueProducts
    };
  }
}