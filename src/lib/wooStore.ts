'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import * as woocommerce from './woocommerce';

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

export interface WooCart {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  total: string;
  isLoading: boolean;
  error: string | null;
}

// Actions interface
interface CartActions {
  initializeCart: () => Promise<void>;
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateCartItem: (id: string, quantity: number) => Promise<void>;
  removeCartItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

// Cart store interface
export interface CartStore extends WooCart, CartActions {}

// Local storage version to handle migrations
const STORAGE_VERSION = 1;

// Create the store
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // State
      id: null,
      items: [],
      itemCount: 0,
      subtotal: '0',
      total: '0',
      isLoading: false,
      error: null,

      // Actions
      initializeCart: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // With WooGraphQL, the cart is associated with the user session
          // and doesn't need a cartId parameter
          const cart = await woocommerce.getCart();
          
          if (cart) {
            // Normalize cart data to our store format
            const normalizedCart = woocommerce.normalizeCart(cart);
            
            set({
              id: normalizedCart.id,
              items: normalizedCart.lines.map(item => ({
                id: item.id,
                productId: item.merchandise.product.id,
                variationId: item.merchandise.id !== item.merchandise.product.id ? item.merchandise.id : undefined,
                quantity: item.quantity,
                name: item.merchandise.title,
                price: item.cost.totalAmount.amount,
                image: item.merchandise.product.image,
                attributes: item.merchandise.selectedOptions,
              })),
              itemCount: normalizedCart.totalQuantity,
              subtotal: normalizedCart.cost.subtotalAmount.amount,
              total: normalizedCart.cost.totalAmount.amount,
              isLoading: false,
            });
            return;
          }
          
          // Create a new cart if we don't have a valid existing one
          const newCart = await woocommerce.createCart();
          
          if (newCart) {
            const normalizedCart = woocommerce.normalizeCart(newCart);
            set({
              id: normalizedCart.id,
              items: [],
              itemCount: 0,
              subtotal: '0',
              total: '0',
              isLoading: false,
            });
          } else {
            throw new Error('Failed to create a new cart');
          }
        } catch (error) {
          console.error('Error initializing cart:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      addToCart: async (item) => {
        set({ isLoading: true, error: null });
        
        try {
          // Create a cart if we don't have one yet
          if (!get().id) {
            await get().initializeCart();
          }
          
          // Add the item to the cart - Note: cartId is kept for compatibility
          // but the WooGraphQL API doesn't actually use it (uses user session)
          const cartInput = [{
            productId: item.productId,
            quantity: item.quantity,
            variationId: item.variationId
          }];
          
          // We pass an empty string as cartId because it's not actually used
          // by the underlying WooGraphQL API
          const updatedCart = await woocommerce.addToCart('', cartInput);
          
          if (updatedCart) {
            const normalizedCart = woocommerce.normalizeCart(updatedCart);
            
            set({
              items: normalizedCart.lines.map(item => ({
                id: item.id,
                productId: item.merchandise.product.id,
                variationId: item.merchandise.id !== item.merchandise.product.id ? item.merchandise.id : undefined,
                quantity: item.quantity,
                name: item.merchandise.title,
                price: item.cost.totalAmount.amount,
                image: item.merchandise.product.image,
                attributes: item.merchandise.selectedOptions,
              })),
              itemCount: normalizedCart.totalQuantity,
              subtotal: normalizedCart.cost.subtotalAmount.amount,
              total: normalizedCart.cost.totalAmount.amount,
              isLoading: false,
            });
          } else {
            throw new Error('Failed to add item to cart');
          }
        } catch (error) {
          console.error('Error adding item to cart:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      updateCartItem: async (id, quantity) => {
        set({ isLoading: true, error: null });
        
        try {
          if (!get().id) {
            throw new Error('Cart not initialized');
          }
          
          if (quantity <= 0) {
            // If quantity is 0 or negative, remove the item
            return get().removeCartItem(id);
          }
          
          // Update the item quantity - note the updated parameter structure
          const items = [{ key: id, quantity }];
          const updatedCart = await woocommerce.updateCart(items);
          
          if (updatedCart) {
            const normalizedCart = woocommerce.normalizeCart(updatedCart);
            
            set({
              items: normalizedCart.lines.map(item => ({
                id: item.id,
                productId: item.merchandise.product.id,
                variationId: item.merchandise.id !== item.merchandise.product.id ? item.merchandise.id : undefined,
                quantity: item.quantity,
                name: item.merchandise.title,
                price: item.cost.totalAmount.amount,
                image: item.merchandise.product.image,
                attributes: item.merchandise.selectedOptions,
              })),
              itemCount: normalizedCart.totalQuantity,
              subtotal: normalizedCart.cost.subtotalAmount.amount,
              total: normalizedCart.cost.totalAmount.amount,
              isLoading: false,
            });
          } else {
            throw new Error('Failed to update cart item');
          }
        } catch (error) {
          console.error('Error updating cart item:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      removeCartItem: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          if (!get().id) {
            throw new Error('Cart not initialized');
          }
          
          // Remove the item from the cart - pass empty string for cartId
          // since WooGraphQL uses session-based cart management
          const updatedCart = await woocommerce.removeFromCart('', [id]);
          
          if (updatedCart) {
            const normalizedCart = woocommerce.normalizeCart(updatedCart);
            
            set({
              items: normalizedCart.lines.map(item => ({
                id: item.id,
                productId: item.merchandise.product.id,
                variationId: item.merchandise.id !== item.merchandise.product.id ? item.merchandise.id : undefined,
                quantity: item.quantity,
                name: item.merchandise.title,
                price: item.cost.totalAmount.amount,
                image: item.merchandise.product.image,
                attributes: item.merchandise.selectedOptions,
              })),
              itemCount: normalizedCart.totalQuantity,
              subtotal: normalizedCart.cost.subtotalAmount.amount,
              total: normalizedCart.cost.totalAmount.amount,
              isLoading: false,
            });
          } else {
            throw new Error('Failed to remove item from cart');
          }
        } catch (error) {
          console.error('Error removing cart item:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      clearCart: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Create a new empty cart
          const newCart = await woocommerce.createCart();
          
          if (newCart) {
            const normalizedCart = woocommerce.normalizeCart(newCart);
            set({
              id: normalizedCart.id,
              items: [],
              itemCount: 0,
              subtotal: '0',
              total: '0',
              isLoading: false,
            });
          } else {
            throw new Error('Failed to create a new cart');
          }
        } catch (error) {
          console.error('Error clearing cart:', error);
          set({
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false,
          });
        }
      },

      setError: (error) => set({ error }),
      setIsLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'woo-cart-storage',
      version: STORAGE_VERSION,
      // Only persist the cart ID, not the entire state
      partialize: (state) => ({ id: state.id }),
      onRehydrateStorage: () => (state) => {
        // When storage is rehydrated, initialize the cart
        if (state && state.id) {
          state.initializeCart();
        }
      },
    }
  )
);

// Helper hooks
export const useCartItems = () => useCartStore(state => state.items);
export const useCartItemCount = () => useCartStore(state => state.itemCount);
export const useCartSubtotal = () => useCartStore(state => state.subtotal);
export const useCartTotal = () => useCartStore(state => state.total);
export const useCartIsLoading = () => useCartStore(state => state.isLoading);
export const useCartError = () => useCartStore(state => state.error);

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