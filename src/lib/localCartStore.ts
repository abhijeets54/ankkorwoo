/**
 * Local Cart Store for Ankkor E-commerce
 *
 * This implementation uses local storage to persist cart data on the client side.
 * When the user proceeds to checkout, the cart items are sent to WooCommerce
 * using the Store API to create a server-side cart before redirecting to the checkout page.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Type definitions
export interface CartItem {
  id: string;
  productId: string;
  variationId?: string;
  quantity: number;
  name: string;
  price: string;
  image?: {
    url: string;
    altText?: string;
  };
  attributes?: Array<{
    name: string;
    value: string;
  }>;
}

export interface LocalCart {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  error: string | null;
}

// Actions interface
interface CartActions {
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateCartItem: (id: string, quantity: number) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  syncWithWooCommerce: (authToken?: string | null) => Promise<string | null>; // Returns checkout URL
}

// Cart store interface
export interface LocalCartStore extends LocalCart, CartActions {
  subtotal: () => number;
  total: () => number;
}

// Local storage version to handle migrations
const STORAGE_VERSION = 1;

// Generate a unique ID for cart items
const generateItemId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Stock validation interface
interface StockValidation {
  available: boolean;
  message?: string;
  stockQuantity?: number;
  stockStatus?: string;
}

// Validate product stock before adding to cart
const validateProductStock = async (
  productId: string,
  requestedQuantity: number,
  variationId?: string
): Promise<StockValidation> => {
  try {
    // Check real-time stock from your API
    const response = await fetch(`/api/products/${productId}/stock${variationId ? `?variation_id=${variationId}` : ''}`);

    if (!response.ok) {
      return { available: false, message: 'Unable to verify stock availability' };
    }

    const stockData = await response.json();

    // Check if product is in stock
    if (stockData.stockStatus !== 'IN_STOCK' && stockData.stockStatus !== 'instock') {
      return {
        available: false,
        message: 'This product is currently out of stock',
        stockStatus: stockData.stockStatus
      };
    }

    // Check if requested quantity is available
    if (stockData.stockQuantity !== null && stockData.stockQuantity < requestedQuantity) {
      return {
        available: false,
        message: `Only ${stockData.stockQuantity} items available in stock`,
        stockQuantity: stockData.stockQuantity,
        stockStatus: stockData.stockStatus
      };
    }

    return {
      available: true,
      stockQuantity: stockData.stockQuantity,
      stockStatus: stockData.stockStatus
    };

  } catch (error) {
    console.error('Stock validation error:', error);
    // In case of error, allow the add to cart but log the issue
    return { available: true, message: 'Stock validation temporarily unavailable' };
  }
};

// Create the store
export const useLocalCartStore = create<LocalCartStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      itemCount: 0,
      isLoading: false,
      error: null,

      // Actions
      addToCart: async (item) => {
        set({ isLoading: true, error: null });
        try {
          // Validate stock before adding to cart
          const stockValidation = await validateProductStock(item.productId, item.quantity, item.variationId);
          if (!stockValidation.available) {
            throw new Error(stockValidation.message || 'Product is out of stock');
          }

          const items = get().items;

          // Normalize price format - remove currency symbols and commas
          let normalizedPrice = item.price;
          if (typeof normalizedPrice === 'string') {
            // Remove currency symbol if present
            const priceString = normalizedPrice.replace(/[₹$€£]/g, '').trim();
            // Replace comma with empty string if present (for Indian number format)
            normalizedPrice = priceString.replace(/,/g, '');
          }

          // Create a normalized item with clean price
          const normalizedItem = {
            ...item,
            price: normalizedPrice
          };

          // Check if the item already exists in the cart
          const existingItemIndex = items.findIndex(
            (cartItem) =>
              cartItem.productId === normalizedItem.productId &&
              cartItem.variationId === normalizedItem.variationId
          );

          if (existingItemIndex !== -1) {
            // If item exists, update quantity
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += normalizedItem.quantity;

            set({
              items: updatedItems,
              itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
              isLoading: false,
            });
          } else {
            // If item doesn't exist, add it with a new ID
            const newItem = {
              ...normalizedItem,
              id: generateItemId(),
            };

            set({
              items: [...items, newItem],
              itemCount: items.reduce((sum, item) => sum + item.quantity, 0) + newItem.quantity,
              isLoading: false,
            });
          }

          // Show success message
          console.log('Item added to cart successfully');

          // Store the updated cart in localStorage immediately to prevent loss
          if (typeof window !== 'undefined') {
            try {
              const state = {
                state: {
                  items: get().items,
                  itemCount: get().itemCount,
                  isLoading: false,
                  error: null
                },
                version: STORAGE_VERSION
              };
              localStorage.setItem('ankkor-local-cart', JSON.stringify(state));
            } catch (storageError) {
              console.warn('Failed to manually persist cart to localStorage:', storageError);
            }
          }
        } catch (error) {
          console.error('Error adding item to cart:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      updateCartItem: (id, quantity) => {
        set({ isLoading: true, error: null });
        try {
          const items = get().items;
          if (quantity <= 0) {
            // If quantity is 0 or negative, remove the item
            return get().removeCartItem(id);
          }

          // Find the item and update its quantity
          const updatedItems = items.map(item =>
            item.id === id ? { ...item, quantity } : item
          );

          set({
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            isLoading: false,
          });

          // Immediately persist to localStorage
          if (typeof window !== 'undefined') {
            try {
              const state = {
                state: {
                  items: updatedItems,
                  itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
                  isLoading: false,
                  error: null
                },
                version: STORAGE_VERSION
              };
              localStorage.setItem('ankkor-local-cart', JSON.stringify(state));
            } catch (storageError) {
              console.warn('Failed to manually persist cart update to localStorage:', storageError);
            }
          }
        } catch (error) {
          console.error('Error updating cart item:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      removeCartItem: (id) => {
        set({ isLoading: true, error: null });
        try {
          const items = get().items;
          const updatedItems = items.filter(item => item.id !== id);

          set({
            items: updatedItems,
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
            isLoading: false,
          });

          // Immediately persist to localStorage
          if (typeof window !== 'undefined') {
            try {
              const state = {
                state: {
                  items: updatedItems,
                  itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
                  isLoading: false,
                  error: null
                },
                version: STORAGE_VERSION
              };
              localStorage.setItem('ankkor-local-cart', JSON.stringify(state));
            } catch (storageError) {
              console.warn('Failed to manually persist cart removal to localStorage:', storageError);
            }
          }
        } catch (error) {
          console.error('Error removing cart item:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      clearCart: () => {
        set({
          items: [],
          itemCount: 0,
          isLoading: false,
          error: null,
        });

        // Immediately persist to localStorage
        if (typeof window !== 'undefined') {
          try {
            const state = {
              state: {
                items: [],
                itemCount: 0,
                isLoading: false,
                error: null
              },
              version: STORAGE_VERSION
            };
            localStorage.setItem('ankkor-local-cart', JSON.stringify(state));
          } catch (storageError) {
            console.warn('Failed to manually persist cart clearing to localStorage:', storageError);
          }
        }
      },

      setError: (error) => {
        set({ error });
      },

      setIsLoading: (isLoading) => {
        set({ isLoading });
      },

      // Helper methods
      subtotal: () => {
        const items = get().items;
        try {
          const calculatedSubtotal = items.reduce((total, item) => {
            // Handle price with or without currency symbol
            let itemPrice = 0;
            if (typeof item.price === 'string') {
              // Remove currency symbol if present
              const priceString = item.price.replace(/[₹$€£]/g, '').trim();
              // Replace comma with empty string if present (for Indian number format)
              const cleanPrice = priceString.replace(/,/g, '');
              itemPrice = parseFloat(cleanPrice);
            } else {
              itemPrice = item.price;
            }

            if (isNaN(itemPrice)) {
              console.warn(`Invalid price for item ${item.id}: ${item.price}`);
              return total;
            }

            return total + (itemPrice * item.quantity);
          }, 0);

          return isNaN(calculatedSubtotal) ? 0 : calculatedSubtotal;
        } catch (error) {
          console.error('Error calculating subtotal:', error);
          return 0;
        }
      },

      total: () => {
        // For now, total is the same as subtotal
        // In the future, you could add shipping, tax, etc.
        const calculatedTotal = get().subtotal();
        return isNaN(calculatedTotal) ? 0 : calculatedTotal;
      },

      // Sync cart with WooCommerce using Store API
      syncWithWooCommerce: async (authToken?: string | null) => {
        const { items } = get();
        if (items.length === 0) {
          throw new Error('Cart is empty');
        }

        try {
          console.log('Syncing cart with WooCommerce...');
          console.log('Auth token provided:', !!authToken);
          set({ isLoading: true });

          // If user is logged in, use the JWT-to-Cookie bridge for seamless checkout
          if (authToken) {
            console.log('User is authenticated, using JWT-to-Cookie bridge');
            try {
              const checkoutUrl = await createWpSessionAndGetCheckoutUrl(authToken, items);
              set({ isLoading: false });
              return checkoutUrl;
            } catch (bridgeError) {
              console.error('JWT-to-Cookie bridge failed:', bridgeError);
              // Fall back to guest checkout if the bridge fails
              console.log('Falling back to guest checkout...');
              // Continue with guest checkout flow below
            }
          }

          // For guest users, redirect directly to WooCommerce checkout
          console.log('User is not authenticated, redirecting to WooCommerce checkout');
          const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL;
          const checkoutUrl = `${baseUrl}/checkout/`;
          console.log('Guest checkout URL:', checkoutUrl);
          set({ isLoading: false });
          return checkoutUrl;
          
        } catch (error) {
          console.error('Error syncing cart with WooCommerce:', error);
          set({ isLoading: false });
          
          // Fallback approach: use URL parameters to build cart
          try {
            console.log('Attempting fallback method for cart sync...');
            const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL;
            
            // Build URL with add-to-cart parameters for each item
            let checkoutUrl = `${baseUrl}/checkout/?guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0&skip_login=1&force_guest_checkout=1`;
            
            // Add each item as a URL parameter
            items.forEach((item, index) => {
              if (index === 0) {
                checkoutUrl += `&add-to-cart=${item.productId}&quantity=${item.quantity}`;
              } else {
                // For WooCommerce, additional items need a different format
                checkoutUrl += `&add-to-cart[${index}]=${item.productId}&quantity[${index}]=${item.quantity}`;
              }
              
              // Add variation ID if present
              if (item.variationId) {
                checkoutUrl += `&variation_id=${item.variationId}`;
              }
            });
            
            console.log('Fallback checkout URL:', checkoutUrl);
            return checkoutUrl;
          } catch (fallbackError) {
            console.error('Fallback method failed:', fallbackError);
            throw new Error('Failed to sync cart with WooCommerce. Please try again or contact support.');
          }
        }
      },
    }),
    {
      name: 'ankkor-local-cart',
      version: STORAGE_VERSION,
    }
  )
);

// Helper hooks
export const useLocalCartItems = () => useLocalCartStore(state => state.items);
export const useLocalCartCount = () => useLocalCartStore(state => state.itemCount);
export const useLocalCartSubtotal = () => useLocalCartStore(state => state.subtotal());
export const useLocalCartTotal = () => useLocalCartStore(state => state.total());
export const useLocalCartLoading = () => useLocalCartStore(state => state.isLoading);
export const useLocalCartError = () => useLocalCartStore(state => state.error);

// Helper functions
export const formatPrice = (price: string | number, currencyCode = 'INR') => {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Clear cart after successful checkout
export const clearCartAfterCheckout = () => {
  useLocalCartStore.getState().clearCart();
  
  // Also reset the cart token to ensure a fresh cart for the next session
  // cartSession.resetCartToken(); // This line was removed as per the edit hint
};



/**
 * Create WordPress session from JWT token and get the checkout URL
 * This implements the JWT-to-Cookie Bridge for seamless checkout experience
 * @param authToken The JWT authentication token
 * @param items Cart items to include in checkout
 * @returns The WooCommerce checkout URL
 */
async function createWpSessionAndGetCheckoutUrl(authToken: string, items: CartItem[]): Promise<string> {
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  const wpUrl = process.env.NEXT_PUBLIC_WP_URL;
  const checkoutUrl = process.env.NEXT_PUBLIC_WP_CHECKOUT_URL;

  if (!wpUrl || !checkoutUrl) {
    throw new Error('WordPress or checkout URL not configured. Check your environment variables.');
  }

  try {
    console.log('Creating WordPress session from JWT token...');
    console.log('Using endpoint:', `${wpUrl}/wp-json/headless/v1/create-wp-session`);
    console.log('Token length:', authToken.length);
    console.log('Token preview:', authToken.substring(0, 20) + '...');

    // Call the custom WordPress endpoint to create a session from JWT
    const response = await fetch(`${wpUrl}/wp-json/headless/v1/create-wp-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      // THIS IS THE CRITICAL LINE - Include token in request body as well
      body: JSON.stringify({ token: authToken }),
      credentials: 'include', // Critical: This allows the browser to receive and set the cookie
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.code || errorMessage;
        console.error('Error response data:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      throw new Error(`Failed to create WordPress session: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (!data.success) {
      throw new Error(data.message || 'Failed to create WordPress session');
    }

    console.log('WordPress session created successfully');
    console.log('Redirecting to checkout URL:', checkoutUrl);

    // For authenticated users, we can directly go to checkout
    // The server already has the user's session and will load the correct cart
    return checkoutUrl;
  } catch (error) {
    console.error('Error creating WordPress session:', error);

    // Provide more specific error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Could not connect to WordPress. Please check your internet connection.');
    }

    throw new Error(error instanceof Error ? error.message : 'Failed to prepare checkout');
  }
}
