'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getShippingRates } from './razorpay';

// Shipping address interface
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
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
  discountCode: string;
  discountAmount: number;
  isDiscountValid: boolean;
  showDiscountError: boolean;
  appliedDiscountCode: string; // The normalized code that was actually applied
  
  // Loading states
  isLoadingShipping: boolean;
  isProcessingPayment: boolean;
  
  // Error handling
  error: string | null;
  
  // Actions
  setCart: (cart: CartItem[]) => void;
  setShippingAddress: (address: ShippingAddress) => void;
  fetchShippingRates: (pincode: string, state?: string) => Promise<void>;
  setSelectedShipping: (option: ShippingOption) => void;
  calculateFinalAmount: () => void;
  setError: (error: string | null) => void;
  setProcessingPayment: (processing: boolean) => void;
  clearCheckout: () => void;
  applyDiscount: () => void;
  setDiscountCode: (code: string) => void;
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
      discountCode: '',
      discountAmount: 0,
      isDiscountValid: false,
      showDiscountError: false,
      appliedDiscountCode: '',
      isLoadingShipping: false,
      isProcessingPayment: false,
      error: null,

      // Actions
      setCart: (cart) => {
        const subtotal = cart.reduce((total, item) => {
          const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
          return total + (price * item.quantity);
        }, 0);

        set({ cart, subtotal });
        
        // Recalculate discount if valid
        const { isDiscountValid } = get();
        if (isDiscountValid) {
          get().applyDiscount();
        } else {
          get().calculateFinalAmount();
        }

        // Note: Shipping recalculation will be triggered by the useEffect in checkout page
        // when it detects the subtotal change
      },

      setShippingAddress: (address) => {
        set({ shippingAddress: address });
      },

      fetchShippingRates: async (pincode, state) => {
        const { cart, subtotal } = get();

        if (!state) {
          set({ error: 'Please select a state' });
          return;
        }

        set({ isLoadingShipping: true, error: null });

        try {
          const shippingOptions = await getShippingRates(pincode || '000000', cart, state);

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
        const { subtotal, shippingCost, discountAmount, finalAmount: currentFinalAmount } = get();
        const subtotalWithShipping = subtotal + shippingCost;
        const newFinalAmount = subtotalWithShipping - discountAmount;

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
          discountCode: '',
          discountAmount: 0,
          isDiscountValid: false,
          showDiscountError: false,
          appliedDiscountCode: '',
          isLoadingShipping: false,
          isProcessingPayment: false,
          error: null,
        });
      },

      setDiscountCode: (code) => {
        // If code is empty, clear discount completely
        if (!code || code.trim() === '') {
          set({
            discountCode: '',
            discountAmount: 0,
            isDiscountValid: false,
            showDiscountError: false,
            appliedDiscountCode: ''
          });
          get().calculateFinalAmount();
        } else {
          // Only update the code and reset error state
          set({
            discountCode: code,
            showDiscountError: false
          });
        }
      },

      applyDiscount: () => {
        const {
          discountCode,
          subtotal,
          shippingCost,
          selectedShipping,
          shippingAddress,
          isLoadingShipping
        } = get();

        // Validate all required information is available
        if (!selectedShipping || !shippingAddress || isLoadingShipping) {
          set({
            isDiscountValid: false,
            discountAmount: 0,
            showDiscountError: true
          });
          return;
        }

        const subtotalWithShipping = subtotal + shippingCost;

        // Normalize the discount code: trim whitespace and convert to uppercase
        // This handles mobile keyboard issues (trailing spaces, autocorrect, autocapitalize)
        const normalizedCode = discountCode.trim().toUpperCase();

        // Frontend-only discount validation
        if (normalizedCode === 'ANKKOR10') {
          // 10% discount
          const discountAmount = Math.round((subtotalWithShipping * 0.10) * 100) / 100;
          const finalAmount = subtotalWithShipping - discountAmount;

          set({
            isDiscountValid: true,
            discountAmount,
            finalAmount,
            showDiscountError: false,
            appliedDiscountCode: normalizedCode
          });
        } else if (normalizedCode === '210123') {
          // 99% discount
          const discountAmount = Math.round((subtotalWithShipping * 0.99) * 100) / 100;
          const finalAmount = subtotalWithShipping - discountAmount;

          set({
            isDiscountValid: true,
            discountAmount,
            finalAmount,
            showDiscountError: false,
            appliedDiscountCode: normalizedCode
          });
        } else {
          // Invalid code
          set({
            isDiscountValid: false,
            discountAmount: 0,
            showDiscountError: true,
            appliedDiscountCode: ''
          });
          get().calculateFinalAmount();
        }
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
