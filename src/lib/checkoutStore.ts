'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getShippingRates } from './razorpay';

// Shipping address interface
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

// Shipping option interface
export interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  description?: string;
  estimatedDays?: string;
}

// Cart item interface (from local cart store)
export interface CartItem {
  id: string;
  productId: string;
  variationId?: string;
  name: string;
  price: string | number;
  quantity: number;
  image?: {
    url: string;
    alt?: string;
  };
}

// Checkout store state interface
interface CheckoutState {
  // Cart data
  cart: CartItem[];
  
  // Shipping information
  shippingAddress: ShippingAddress | null;
  shippingOptions: ShippingOption[];
  selectedShipping: ShippingOption | null;
  
  // Pricing
  subtotal: number;
  shippingCost: number;
  finalAmount: number;
  
  // Loading states
  isLoadingShipping: boolean;
  isProcessingPayment: boolean;
  
  // Error handling
  error: string | null;
  
  // Actions
  setCart: (cart: CartItem[]) => void;
  setShippingAddress: (address: ShippingAddress) => void;
  fetchShippingRates: (pincode: string) => Promise<void>;
  setSelectedShipping: (option: ShippingOption) => void;
  calculateFinalAmount: () => void;
  setError: (error: string | null) => void;
  setProcessingPayment: (processing: boolean) => void;
  clearCheckout: () => void;
}

// Create the checkout store
export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      // Initial state
      cart: [],
      shippingAddress: null,
      shippingOptions: [],
      selectedShipping: null,
      subtotal: 0,
      shippingCost: 0,
      finalAmount: 0,
      isLoadingShipping: false,
      isProcessingPayment: false,
      error: null,

      // Actions
      setCart: (cart) => {
        const subtotal = cart.reduce((total, item) => {
          const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
          return total + (price * item.quantity);
        }, 0);

        // Calculate final amount directly to avoid separate state update
        const { shippingCost } = get();
        const finalAmount = subtotal + shippingCost;

        set({ cart, subtotal, finalAmount });
      },

      setShippingAddress: (address) => {
        set({ shippingAddress: address });
      },

      fetchShippingRates: async (pincode) => {
        const { cart, subtotal } = get();

        if (!pincode || pincode.length < 6) {
          set({ error: 'Please enter a valid pincode' });
          return;
        }

        set({ isLoadingShipping: true, error: null });

        try {
          const shippingOptions = await getShippingRates(pincode, cart);

          // Automatically select the single shipping option
          const selectedShipping = shippingOptions.length > 0 ? shippingOptions[0] : null;
          const shippingCost = selectedShipping ? selectedShipping.cost : 0;
          const finalAmount = subtotal + shippingCost;

          set({
            shippingOptions,
            isLoadingShipping: false,
            selectedShipping,
            shippingCost,
            finalAmount
          });
        } catch (error) {
          console.error('Error fetching shipping rates:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch shipping rates',
            isLoadingShipping: false,
            shippingOptions: []
          });
        }
      },

      setSelectedShipping: (option) => {
        const { subtotal } = get();
        const finalAmount = subtotal + option.cost;

        set({
          selectedShipping: option,
          shippingCost: option.cost,
          finalAmount
        });
      },

      calculateFinalAmount: () => {
        const { subtotal, shippingCost, finalAmount: currentFinalAmount } = get();
        const newFinalAmount = subtotal + shippingCost;

        // Only update if the value actually changed to prevent infinite loops
        if (newFinalAmount !== currentFinalAmount) {
          set({ finalAmount: newFinalAmount });
        }
      },

      setError: (error) => {
        set({ error });
      },

      setProcessingPayment: (processing) => {
        set({ isProcessingPayment: processing });
      },

      clearCheckout: () => {
        set({
          cart: [],
          shippingAddress: null,
          shippingOptions: [],
          selectedShipping: null,
          subtotal: 0,
          shippingCost: 0,
          finalAmount: 0,
          isLoadingShipping: false,
          isProcessingPayment: false,
          error: null,
        });
      },
    }),
    {
      name: 'checkout-storage',
      partialize: (state) => ({
        shippingAddress: state.shippingAddress,
        selectedShipping: state.selectedShipping,
      }),
    }
  )
);
