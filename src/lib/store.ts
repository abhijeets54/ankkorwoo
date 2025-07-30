import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  createCart, 
  addToCart, 
  updateCart, 
  removeFromCart,
  getCart,
  normalizeCart
} from './woocommerce';

export type CartItem = {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  handle: string;
  image: string;
  price: string;
  quantity: number;
  currencyCode: string;
};

export type WishlistItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  handle: string;
  material: string;
  variantId: string;
};

// Add type definition for the cart return type from Shopify
interface ShopifyCart {
  id: string;
  checkoutUrl: string | null;
  lines: any[];
  cost: {
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

type CartState = {
  cartId: string | null;
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  subtotal: string;
  total: string;
  currencyCode: string;
  itemCount: number;
  checkoutUrl: string | null;
  initializationInProgress: boolean;
  initializationError: string | null;
  
  // Actions
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  initCart: () => Promise<ShopifyCart | null>;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

// Safe localStorage operation that won't cause errors during SSR
const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch (error) {
      console.error('localStorage.getItem error:', error);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.error('localStorage.setItem error:', error);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error('localStorage.removeItem error:', error);
    }
  }
};

// Helper function to safely update cart state
const updateCartState = (set: any, normalizedCart: any) => {
  try {
    if (!normalizedCart || !normalizedCart.lines) {
      console.error('Invalid normalized cart data', normalizedCart);
      return;
    }

    const itemCount = normalizedCart.lines.reduce(
      (acc: number, line: any) => acc + (line.quantity || 0), 
      0
    );

    const items = normalizedCart.lines.map((line: any) => ({
      id: line.id,
      variantId: line.merchandise.id,
      productId: line.merchandise.product.id,
      title: line.merchandise.product.title,
      handle: line.merchandise.product.handle,
      image: line.merchandise.product.image?.url || '',
      price: line.merchandise.price,
      quantity: line.quantity,
      currencyCode: line.merchandise.currencyCode
    }));

    set({
      items,
      subtotal: normalizedCart.cost.subtotalAmount.amount,
      total: normalizedCart.cost.totalAmount.amount,
      currencyCode: normalizedCart.cost.totalAmount.currencyCode,
      itemCount,
      checkoutUrl: normalizedCart.checkoutUrl,
      isLoading: false
    });
  } catch (error) {
    console.error('Error updating cart state:', error);
    // Fallback to clearing state but keeping cart ID
    set({
      items: [],
      subtotal: '0.00',
      total: '0.00',
      itemCount: 0,
      isLoading: false
    });
  }
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      items: [],
      isOpen: false,
      isLoading: false,
      subtotal: '0.00',
      total: '0.00',
      currencyCode: 'USD',
      itemCount: 0,
      checkoutUrl: null,
      initializationInProgress: false,
      initializationError: null,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      initCart: async () => {
        const state = get();
        
        // Prevent multiple concurrent initialization
        if (state.initializationInProgress) {
          console.log('Cart initialization already in progress, skipping');
          return null;
        }
        
        set({ 
          isLoading: true, 
          initializationInProgress: true,
          initializationError: null 
        });
        
        try {
          // Check if we already have a cart ID
          if (state.cartId) {
            // Validate the existing cart - note: getCart no longer needs cartId
            try {
              const existingCart = await getCart();
              if (existingCart) {
                set({
                  isLoading: false,
                  initializationInProgress: false
                });
                return existingCart as ShopifyCart;
              }
            } catch (error) {
              console.log('Existing cart validation failed, creating new cart');
              // Fall through to create a new cart
            }
          }
          
          // Create a new cart
          const newCart = await createCart() as ShopifyCart | null;
          
          if (newCart && newCart.id) {
            set({
              cartId: newCart.id,
              checkoutUrl: newCart.checkoutUrl,
              isLoading: false,
              initializationInProgress: false
            });
            console.log('Cart initialized with ID:', newCart.id);
            return newCart;
          }
          
          throw new Error('Failed to create cart: No cart ID returned');
        } catch (error) {
          console.error('Failed to initialize cart:', error);
          set({ 
            isLoading: false, 
            initializationInProgress: false,
            initializationError: error instanceof Error ? error.message : 'Unknown error initializing cart'
          });
          return null;
        }
      },

      addItem: async (item) => {
        set({ isLoading: true });
        
        try {
          // Validate essential item properties
          if (!item.variantId) {
            console.error('Cannot add item to cart: Missing variant ID', item);
            set({ isLoading: false });
            throw new Error('Missing variant ID for item');
          }
          
          let cartId = get().cartId;
          
          if (!cartId) {
            console.log('Cart not initialized, creating a new cart...');
            const newCart = await createCart();
            
            if (newCart && newCart.id) {
              console.log('New cart created:', newCart.id);
              cartId = newCart.id;
            } else {
              throw new Error('Failed to initialize cart');
            }
          }
          
          // At this point cartId should be a valid string
          if (!cartId) {
            throw new Error('Failed to initialize cart: No cart ID available');
          }
          
          // Log the variant ID for debugging
          console.log(`Adding item to cart: ${item.title} (${item.variantId}), quantity: ${item.quantity}`);
          
          try {
            const cart = await addToCart(cartId, [{
              merchandiseId: item.variantId,
              quantity: item.quantity || 1
            }]);
            
            if (!cart) {
              throw new Error('Failed to add item to cart: No cart returned');
            }
            
            // Normalize and update cart state
            const normalizedCart = normalizeCart(cart);
            updateCartState(set, normalizedCart);
            set({ isOpen: true }); // Open cart when item is added
            
            console.log(`Item added to cart successfully. Cart now has ${normalizedCart.lines.length} items.`);
          } catch (apiError: unknown) {
            console.error('Shopify API error when adding to cart:', apiError);
            // Re-throw with more context
            if (apiError instanceof Error) {
              throw new Error(`Failed to add item to cart: ${apiError.message}`);
            } else {
              throw new Error(`Failed to add item to cart: Unknown API error`);
            }
          }
        } catch (error) {
          console.error('Failed to add item to cart:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateItem: async (id, quantity) => {
        const state = get();
        set({ isLoading: true });
        
        try {
          if (!state.cartId) {
            throw new Error('Cart not initialized');
          }
          
          console.log(`Updating item in cart: ${id}, new quantity: ${quantity}`);
          
          // If quantity is 0 or less, remove the item
          if (quantity <= 0) {
            console.log(`Quantity is ${quantity}, removing item from cart`);
            return get().removeItem(id);
          }
          
          const cart = await updateCart(state.cartId, [{
            id,
            quantity
          }]);
          
          if (!cart) {
            throw new Error('Failed to update item: No cart returned');
          }
          
          // Normalize and update cart state
          const normalizedCart = normalizeCart(cart);
          updateCartState(set, normalizedCart);
          
          console.log(`Item updated successfully. Cart now has ${normalizedCart.lines.length} items.`);
        } catch (error) {
          console.error('Failed to update item in cart:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      removeItem: async (id) => {
        const state = get();
        set({ isLoading: true });
        
        try {
          if (!state.cartId) {
            console.error('Cannot remove item: Cart not initialized');
            throw new Error('Cart not initialized');
          }
          
          console.log(`Removing item from cart: ${id}`);
          
          // Get current cart state for comparison
          const beforeItems = [...state.items];
          const itemBeingRemoved = beforeItems.find(item => item.id === id);
          
          if (!itemBeingRemoved) {
            console.warn(`Item with ID ${id} not found in cart`);
          } else {
            console.log(`Removing "${itemBeingRemoved.title}" (${itemBeingRemoved.variantId}) from cart`);
          }
          
          const cart = await removeFromCart(state.cartId, [id]);
          
          if (!cart) {
            console.error('Failed to remove item: No cart returned from Shopify');
            throw new Error('Failed to remove item: No cart returned');
          }
          
          // Normalize and update cart state
          const normalizedCart = normalizeCart(cart);
          
          // Get updated items for comparison
          const afterRemovalItems = normalizedCart.lines.map((line: any) => ({
            id: line.id,
            title: line.merchandise.product.title,
          }));
          
          console.log('Cart before removal:', beforeItems.length, 'items');
          console.log('Cart after removal:', afterRemovalItems.length, 'items');
          
          if (beforeItems.length === afterRemovalItems.length) {
            console.warn('Item count did not change after removal operation');
          }
          
          updateCartState(set, normalizedCart);
          
          console.log(`Item removed successfully. Cart now has ${normalizedCart.lines.length} items.`);
        } catch (error) {
          console.error('Failed to remove item from cart:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      clearCart: async () => {
        const state = get();
        set({ isLoading: true });
        
        try {
          // When clearing the cart, we simply create a new empty cart in Shopify
          // and update our local state to reflect that
          console.log('Clearing cart and creating a new one');
          const cart = await createCart();
          
          if (!cart) {
            throw new Error('Failed to create new cart');
          }
          
          set({
            cartId: cart.id,
            items: [],
            subtotal: '0.00',
            total: '0.00',
            itemCount: 0,
            checkoutUrl: cart.checkoutUrl,
            isLoading: false
          });
          
          console.log('Cart cleared successfully. New cart ID:', cart.id);
        } catch (error) {
          console.error('Failed to clear cart:', error);
          set({ isLoading: false });
          throw error;
        }
      }
    }),
    {
      name: 'ankkor-cart',
      storage: createJSONStorage(() => safeLocalStorage),
      version: 1,
      partialize: (state) => ({
        cartId: state.cartId,
        items: state.items,
        subtotal: state.subtotal,
        total: state.total,
        currencyCode: state.currencyCode,
        itemCount: state.itemCount,
        checkoutUrl: state.checkoutUrl
      }),
    }
  )
);

// Wishlist store
type WishlistState = {
  items: WishlistItem[];
  isLoading: boolean;
  
  // Actions
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  clearWishlist: () => void;
  isInWishlist: (id: string) => boolean;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      
      addToWishlist: (item) => {
        set((state) => {
          // Check if item already exists in wishlist
          if (state.items.some(wishlistItem => wishlistItem.id === item.id)) {
            return state; // Item already exists, don't add it again
          }
          
          return {
            items: [...state.items, item]
          };
        });
      },
      
      removeFromWishlist: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }));
      },
      
      clearWishlist: () => {
        set({ items: [] });
      },
      
      isInWishlist: (id) => {
        return get().items.some(item => item.id === id);
      }
    }),
    {
      name: 'ankkor-wishlist',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        items: state.items
      }),
      skipHydration: true, // Prevent SSR hydration mismatches
    }
  )
); 