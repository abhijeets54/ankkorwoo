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
  discountType: string; // The type of discount (percent, fixed_cart, etc)
  discountPercentage: number; // The percentage value for display
  
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
      discountType: '',
      discountPercentage: 0,
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
        console.log('📝 Shipping address saved to store:', address);
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
          discountType: '',
          discountPercentage: 0,
          isLoadingShipping: false,
          isProcessingPayment: false,
          error: null,
        });
      },

      setDiscountCode: (code) => {
        console.log('📝 Setting discount code:', { original: code, trimmed: code.trim() });
        
        // If code is empty, clear discount completely
        if (!code || code.trim() === '') {
          console.log('🧹 Clearing discount code');
          set({
            discountCode: '',
            discountAmount: 0,
            isDiscountValid: false,
            showDiscountError: false,
            appliedDiscountCode: '',
            discountType: '',
            discountPercentage: 0
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

      applyDiscount: async () => {
        const {
          discountCode,
          subtotal,
          shippingCost,
          selectedShipping,
          shippingAddress,
          isLoadingShipping
        } = get();

        console.log('🔍 Applying discount code:', {
          rawCode: discountCode,
          trimmedCode: discountCode.trim(),
          codeLength: discountCode.length,
          subtotal,
          shippingCost,
          hasShipping: !!selectedShipping,
          hasAddress: !!shippingAddress,
          isLoading: isLoadingShipping,
          addressDetails: shippingAddress ? {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            email: shippingAddress.email,
            hasAllFields: !!(
              shippingAddress.firstName &&
              shippingAddress.lastName &&
              shippingAddress.email &&
              shippingAddress.address1 &&
              shippingAddress.city &&
              shippingAddress.state &&
              shippingAddress.pincode &&
              shippingAddress.phone
            )
          } : null
        });

        // Validate all required information is available
        if (!shippingAddress) {
          console.log('❌ Missing shipping address');
          set({
            isDiscountValid: false,
            discountAmount: 0,
            showDiscountError: true,
            error: 'Please fill in your shipping address first'
          });
          return;
        }

        // Validate all address fields are filled
        if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.email ||
            !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.state ||
            !shippingAddress.pincode || !shippingAddress.phone) {
          console.log('❌ Incomplete shipping address');
          set({
            isDiscountValid: false,
            discountAmount: 0,
            showDiscountError: true,
            error: 'Please complete all shipping address fields'
          });
          return;
        }

        if (!selectedShipping || isLoadingShipping) {
          console.log('❌ Missing shipping calculation');
          set({
            isDiscountValid: false,
            discountAmount: 0,
            showDiscountError: true,
            error: 'Please wait for shipping calculation to complete'
          });
          return;
        }

        // Check if discount code is empty after trimming
        const trimmedCode = discountCode.trim();
        if (!trimmedCode) {
          console.log('❌ Empty discount code after trim');
          set({
            isDiscountValid: false,
            discountAmount: 0,
            showDiscountError: true,
            appliedDiscountCode: '',
            error: 'Please enter a discount code'
          });
          return;
        }

        const subtotalWithShipping = subtotal + shippingCost;

        // Set loading state
        set({ isLoadingShipping: true, error: null });

        try {
          console.log('🌐 Validating coupon with WooCommerce API...', {
            code: trimmedCode,
            cartTotal: subtotalWithShipping,
            email: shippingAddress.email
          });

          // Call backend API to validate coupon with WooCommerce
          const response = await fetch('/api/validate-coupon', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: trimmedCode,
              cartTotal: subtotalWithShipping,
              customerEmail: shippingAddress.email
            })
          });

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          const data = await response.json();

          console.log('📦 API Response:', data);

          if (data.valid && data.coupon) {
            // Coupon is valid - apply the discount
            const discountAmount = data.coupon.discountAmount;
            const finalAmount = subtotalWithShipping - discountAmount;

            console.log('✅ Coupon applied:', {
              code: data.coupon.code,
              type: data.coupon.discountType,
              amount: data.coupon.amount,
              discountAmount,
              finalAmount
            });

            set({
              isDiscountValid: true,
              discountAmount,
              finalAmount,
              showDiscountError: false,
              appliedDiscountCode: data.coupon.code,
              discountType: data.coupon.discountType,
              discountPercentage: data.coupon.discountType === 'percent' ? data.coupon.amount : 0,
              isLoadingShipping: false,
              error: null
            });
          } else {
            // Invalid coupon
            console.log('❌ Invalid coupon:', data.message);
            set({
              isDiscountValid: false,
              discountAmount: 0,
              showDiscountError: true,
              appliedDiscountCode: '',
              discountType: '',
              discountPercentage: 0,
              isLoadingShipping: false,
              error: data.message || 'Invalid discount code'
            });
            get().calculateFinalAmount();
          }
        } catch (error) {
          console.error('❌ Error validating coupon:', error);
          set({
            isDiscountValid: false,
            discountAmount: 0,
            showDiscountError: true,
            appliedDiscountCode: '',
            discountType: '',
            discountPercentage: 0,
            isLoadingShipping: false,
            error: error instanceof Error ? error.message : 'Failed to validate coupon. Please try again.'
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