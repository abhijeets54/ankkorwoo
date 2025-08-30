'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartService, CartItemInput } from '@/services/CartService';
import { StockReservationService } from '@/services/StockReservationService';

// Enhanced cart item interface
export interface ProductionCartItem {
  id: string;
  productId: string;
  variationId?: string;
  quantity: number;
  name: string;
  price: number;
  image?: {
    url: string;
    altText?: string;
  };
  attributes?: Array<{
    name: string;
    value: string;
  }>;
  reservationId?: string;
  reservedUntil?: string;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'low_stock';
  availableQuantity?: number;
}

export interface ProductionCartState {
  cartId: string | null;
  items: ProductionCartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;
  
  // User context
  userId?: string;
  sessionId?: string;
  
  // Reservation tracking
  activeReservations: string[];
}

interface ProductionCartActions {
  // Cart management
  initializeCart: (userId?: string, sessionId?: string) => Promise<void>;
  addToCart: (item: Omit<ProductionCartItem, 'id'>) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeCartItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Stock management
  validateStock: (productId: string, quantity: number, variationId?: string) => Promise<boolean>;
  refreshStock: () => Promise<void>;
  
  // Checkout
  prepareCheckout: () => Promise<string>; // Returns checkout URL
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Sync operations
  syncWithServer: () => Promise<void>;
  mergeGuestCart: (userId: string) => Promise<void>;
}

export interface ProductionCartStore extends ProductionCartState, ProductionCartActions {
  // Computed values
  getItemById: (itemId: string) => ProductionCartItem | undefined;
  getCartTotal: () => number;
  getUniqueProductCount: () => number;
  hasExpiredReservations: () => boolean;
}

// Services
const cartService = new CartService();
const stockService = new StockReservationService();

// Generate session ID for guest users
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Storage version for migrations
const STORAGE_VERSION = 2;

export const useProductionCartStore = create<ProductionCartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      cartId: null,
      items: [],
      itemCount: 0,
      subtotal: 0,
      isLoading: false,
      error: null,
      lastSyncAt: null,
      activeReservations: [],

      // Actions
      initializeCart: async (userId?: string, sessionId?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Use existing sessionId or generate new one for guests
          const effectiveSessionId = sessionId || get().sessionId || generateSessionId();
          
          // Get or create cart from database
          const cart = await cartService.getOrCreateCart(userId, effectiveSessionId);
          
          // Calculate totals
          const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
          const subtotal = cart.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
          
          // Map database items to store format
          const items: ProductionCartItem[] = cart.items.map(item => ({
            id: item.id,
            productId: item.productId,
            variationId: item.variationId || undefined,
            quantity: item.quantity,
            name: item.name,
            price: Number(item.price),
            image: item.imageUrl ? { url: item.imageUrl } : undefined,
            attributes: item.attributes ? Object.entries(item.attributes as Record<string, any>).map(([name, value]) => ({ name, value: String(value) })) : undefined,
            reservationId: item.reservationId || undefined
          }));

          set({
            cartId: cart.id,
            userId,
            sessionId: effectiveSessionId,
            items,
            itemCount,
            subtotal,
            isLoading: false,
            lastSyncAt: new Date().toISOString()
          });

          // Refresh stock status for all items
          await get().refreshStock();
          
        } catch (error) {
          console.error('Failed to initialize cart:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize cart',
            isLoading: false
          });
        }
      },

      addToCart: async (item) => {
        const { cartId, userId, sessionId } = get();
        
        if (!cartId) {
          await get().initializeCart(userId, sessionId);
        }

        set({ isLoading: true, error: null });

        try {
          const currentCartId = get().cartId;
          if (!currentCartId) {
            throw new Error('Cart not initialized');
          }

          // Validate stock before adding
          const stockValid = await get().validateStock(item.productId, item.quantity, item.variationId);
          if (!stockValid) {
            throw new Error('Insufficient stock available');
          }

          // Create stock reservation
          let reservationId: string | undefined;
          try {
            const reservationResult = await stockService.createReservation(
              item.productId,
              item.quantity,
              userId,
              sessionId,
              item.variationId
            );

            if (reservationResult.success && reservationResult.reservation) {
              reservationId = reservationResult.reservation.id;
            } else {
              console.warn('Failed to create stock reservation:', reservationResult.error);
              // Continue without reservation in development, fail in production
              if (process.env.NODE_ENV === 'production') {
                throw new Error(reservationResult.error || 'Failed to reserve stock');
              }
            }
          } catch (reservationError) {
            console.error('Stock reservation failed:', reservationError);
            if (process.env.NODE_ENV === 'production') {
              throw new Error('Unable to reserve stock for this item');
            }
          }

          // Prepare item data for database
          const itemData: CartItemInput = {
            productId: item.productId,
            variationId: item.variationId,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            imageUrl: item.image?.url,
            attributes: item.attributes?.reduce((acc, attr) => ({
              ...acc,
              [attr.name]: attr.value
            }), {})
          };

          // Add to database
          const dbItem = await cartService.addToCart(currentCartId, itemData, reservationId);

          // Update local state
          const currentState = get();
          const existingItemIndex = currentState.items.findIndex(
            cartItem => cartItem.productId === item.productId && cartItem.variationId === item.variationId
          );

          let updatedItems: ProductionCartItem[];
          
          if (existingItemIndex !== -1) {
            // Update existing item
            updatedItems = [...currentState.items];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              id: dbItem.id,
              quantity: Number(dbItem.quantity),
              price: Number(dbItem.price),
              reservationId: dbItem.reservationId || undefined
            };
          } else {
            // Add new item
            const newItem: ProductionCartItem = {
              id: dbItem.id,
              productId: dbItem.productId,
              variationId: dbItem.variationId || undefined,
              quantity: dbItem.quantity,
              name: dbItem.name,
              price: Number(dbItem.price),
              image: item.image,
              attributes: item.attributes,
              reservationId: dbItem.reservationId || undefined
            };
            updatedItems = [...currentState.items, newItem];
          }

          // Recalculate totals
          const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          // Update reservations list
          const activeReservations = reservationId 
            ? [...currentState.activeReservations, reservationId]
            : currentState.activeReservations;

          set({
            items: updatedItems,
            itemCount,
            subtotal,
            activeReservations,
            isLoading: false,
            lastSyncAt: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error adding item to cart:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to add item to cart',
            isLoading: false
          });
          throw error;
        }
      },

      updateCartItem: async (itemId, quantity) => {
        set({ isLoading: true, error: null });

        try {
          if (quantity <= 0) {
            await get().removeCartItem(itemId);
            return;
          }

          // Find item to validate stock
          const currentItem = get().items.find(item => item.id === itemId);
          if (!currentItem) {
            throw new Error('Cart item not found');
          }

          // Validate stock for new quantity
          const stockValid = await get().validateStock(currentItem.productId, quantity, currentItem.variationId);
          if (!stockValid) {
            throw new Error('Insufficient stock for requested quantity');
          }

          // Update in database
          await cartService.updateCartItemQuantity(itemId, quantity);

          // Update local state
          const currentState = get();
          const updatedItems = currentState.items.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          );

          const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          set({
            items: updatedItems,
            itemCount,
            subtotal,
            isLoading: false,
            lastSyncAt: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error updating cart item:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update cart item',
            isLoading: false
          });
          throw error;
        }
      },

      removeCartItem: async (itemId) => {
        set({ isLoading: true, error: null });

        try {
          // Get item info before removal (for reservation cleanup)
          const item = get().items.find(i => i.id === itemId);
          
          // Remove from database
          await cartService.removeCartItem(itemId);

          // Release reservation if exists
          if (item?.reservationId) {
            try {
              await stockService.releaseReservation(item.reservationId);
            } catch (reservationError) {
              console.warn('Failed to release reservation:', reservationError);
            }
          }

          // Update local state
          const currentState = get();
          const updatedItems = currentState.items.filter(item => item.id !== itemId);
          const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          // Remove from active reservations
          const activeReservations = item?.reservationId
            ? currentState.activeReservations.filter(id => id !== item.reservationId)
            : currentState.activeReservations;

          set({
            items: updatedItems,
            itemCount,
            subtotal,
            activeReservations,
            isLoading: false,
            lastSyncAt: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error removing cart item:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to remove cart item',
            isLoading: false
          });
          throw error;
        }
      },

      clearCart: async () => {
        const { cartId, activeReservations } = get();
        if (!cartId) return;

        set({ isLoading: true, error: null });

        try {
          // Clear cart in database
          await cartService.clearCart(cartId);

          // Release all active reservations
          for (const reservationId of activeReservations) {
            try {
              await stockService.releaseReservation(reservationId);
            } catch (error) {
              console.warn('Failed to release reservation:', reservationId, error);
            }
          }

          // Clear local state
          set({
            items: [],
            itemCount: 0,
            subtotal: 0,
            activeReservations: [],
            isLoading: false,
            lastSyncAt: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error clearing cart:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to clear cart',
            isLoading: false
          });
        }
      },

      validateStock: async (productId, quantity, variationId) => {
        try {
          const stockResult = await stockService.checkAvailableStock(productId, variationId);
          return stockResult.success && stockResult.availableStock >= quantity;
        } catch (error) {
          console.error('Error validating stock:', error);
          return false;
        }
      },

      refreshStock: async () => {
        const { items } = get();
        if (items.length === 0) return;

        try {
          const updatedItems = await Promise.all(
            items.map(async (item) => {
              try {
                const stockResult = await stockService.checkAvailableStock(
                  item.productId, 
                  item.variationId
                );
                
                return {
                  ...item,
                  stockStatus: stockResult.success && stockResult.availableStock > 0 
                    ? (stockResult.availableStock < 5 ? 'low_stock' : 'in_stock')
                    : 'out_of_stock',
                  availableQuantity: stockResult.availableStock || 0
                } as ProductionCartItem;
              } catch (error) {
                console.warn(`Failed to check stock for product ${item.productId}:`, error);
                return item;
              }
            })
          );

          set({ items: updatedItems });
        } catch (error) {
          console.error('Error refreshing stock:', error);
        }
      },

      prepareCheckout: async () => {
        const { cartId, userId, items } = get();
        
        if (!cartId || items.length === 0) {
          throw new Error('Cart is empty');
        }

        set({ isLoading: true, error: null });

        try {
          // Validate all items still have stock
          for (const item of items) {
            const stockValid = await get().validateStock(item.productId, item.quantity, item.variationId);
            if (!stockValid) {
              throw new Error(`Item "${item.name}" is no longer available in the requested quantity`);
            }
          }

          // Convert cart to order (this will mark cart as converted)
          const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          await cartService.convertCart(cartId, orderId);

          // Confirm all reservations
          for (const reservationId of get().activeReservations) {
            try {
              await stockService.confirmReservation(reservationId);
            } catch (error) {
              console.warn('Failed to confirm reservation:', reservationId, error);
            }
          }

          // Generate checkout URL
          const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL;
          const checkoutUrl = `${baseUrl}/checkout/?ankkor_cart=${cartId}&order_id=${orderId}`;

          set({ isLoading: false });
          return checkoutUrl;

        } catch (error) {
          console.error('Error preparing checkout:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to prepare checkout',
            isLoading: false
          });
          throw error;
        }
      },

      syncWithServer: async () => {
        const { cartId } = get();
        if (!cartId) return;

        try {
          const cart = await cartService.getCartWithItems(cartId);
          if (!cart) return;

          // Update local state with server data
          const items: ProductionCartItem[] = cart.items.map(item => ({
            id: item.id,
            productId: item.productId,
            variationId: item.variationId || undefined,
            quantity: item.quantity,
            name: item.name,
            price: Number(item.price),
            image: item.imageUrl ? { url: item.imageUrl } : undefined,
            reservationId: item.reservationId || undefined
          }));

          const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
          const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          set({
            items,
            itemCount,
            subtotal,
            lastSyncAt: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error syncing with server:', error);
        }
      },

      mergeGuestCart: async (userId) => {
        const { sessionId } = get();
        if (!sessionId) return;

        set({ isLoading: true, error: null });

        try {
          const mergedCart = await cartService.mergeGuestCartWithUserCart(sessionId, userId);
          
          // Update state with merged cart
          const items: ProductionCartItem[] = mergedCart.items.map(item => ({
            id: item.id,
            productId: item.productId,
            variationId: item.variationId || undefined,
            quantity: item.quantity,
            name: item.name,
            price: Number(item.price),
            image: item.imageUrl ? { url: item.imageUrl } : undefined,
            reservationId: item.reservationId || undefined
          }));

          const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
          const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          set({
            cartId: mergedCart.id,
            userId,
            items,
            itemCount,
            subtotal,
            isLoading: false,
            lastSyncAt: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error merging guest cart:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to merge cart',
            isLoading: false
          });
        }
      },

      // Helper methods
      getItemById: (itemId) => {
        return get().items.find(item => item.id === itemId);
      },

      getCartTotal: () => {
        return get().subtotal; // Can be extended to include tax, shipping, etc.
      },

      getUniqueProductCount: () => {
        return get().items.length;
      },

      hasExpiredReservations: () => {
        const now = Date.now();
        return get().items.some(item => {
          if (!item.reservedUntil) return false;
          return new Date(item.reservedUntil).getTime() < now;
        });
      },

      // Error handling
      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'ankkor-production-cart',
      version: STORAGE_VERSION,
      partialize: (state) => ({
        cartId: state.cartId,
        userId: state.userId,
        sessionId: state.sessionId,
        lastSyncAt: state.lastSyncAt
      }),
      skipHydration: true
    }
  )
);

// Helper hooks for specific data
export const useCartItems = () => useProductionCartStore(state => state.items);
export const useCartCount = () => useProductionCartStore(state => state.itemCount);
export const useCartSubtotal = () => useProductionCartStore(state => state.subtotal);
export const useCartLoading = () => useProductionCartStore(state => state.isLoading);
export const useCartError = () => useProductionCartStore(state => state.error);