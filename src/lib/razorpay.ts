/**
 * Razorpay Integration for Custom Headless Checkout
 * 
 * This module provides functions to interact with Razorpay payment gateway
 * for creating payment orders and verifying payments.
 */

// Declare Razorpay global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Types for Razorpay integration
export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (100 paise = ₹1)
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface PaymentVerificationResponse {
  success: boolean;
  orderId?: string;
  message?: string;
}

/**
 * Load Razorpay SDK script
 * @returns Promise that resolves when script is loaded
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      console.log('Razorpay SDK loaded successfully');
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Create a Razorpay order via backend API
 * @param amount Amount in INR (will be converted to paise)
 * @param receipt Order receipt/reference
 * @param notes Additional notes for the order
 * @returns Razorpay order details
 */
export const createRazorpayOrder = async (
  amount: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<RazorpayOrderResponse> => {
  try {
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (amount < 1) {
      throw new Error('Minimum order amount is ₹1');
    }

    console.log('Creating Razorpay order:', { amount, receipt, notes });

    const response = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to paise
        receipt,
        notes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Razorpay order creation failed:', errorData);

      if (response.status === 400) {
        throw new Error(errorData.error || 'Invalid order data');
      } else if (response.status === 500) {
        throw new Error('Payment gateway error. Please try again.');
      } else {
        throw new Error(errorData.error || 'Failed to create payment order');
      }
    }

    const data = await response.json();
    console.log('Razorpay order created successfully:', data.id);
    return data;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);

    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to create payment order');
    }
  }
};

/**
 * Verify Razorpay payment via backend API
 * @param paymentData Payment response from Razorpay
 * @param orderData Order details for verification
 * @returns Payment verification result
 */
export const verifyRazorpayPayment = async (
  paymentData: RazorpaySuccessResponse,
  orderData: {
    address: any;
    cartItems: any[];
    shipping: any;
  }
): Promise<PaymentVerificationResponse> => {
  try {
    const response = await fetch('/api/razorpay/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_signature: paymentData.razorpay_signature,
        address: orderData.address,
        cartItems: orderData.cartItems,
        shipping: orderData.shipping,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Payment verification failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * Initialize Razorpay checkout
 * @param options Razorpay options
 * @returns Promise that resolves when payment is complete or rejected when canceled
 */
export const initializeRazorpayCheckout = (options: RazorpayOptions): Promise<RazorpaySuccessResponse> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !window.Razorpay) {
        reject(new Error('Razorpay SDK not loaded'));
        return;
      }

      const razorpayInstance = new window.Razorpay({
        ...options,
        handler: (response: RazorpaySuccessResponse) => {
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment canceled by user'));
          },
        },
      });

      razorpayInstance.open();
    } catch (error) {
      console.error('Error initializing Razorpay:', error);
      reject(error);
    }
  });
};

/**
 * Get shipping rates from backend
 * @param pincode Postal code for shipping calculation
 * @param cartItems Cart items for shipping calculation
 * @returns Array of shipping options
 */
export const getShippingRates = async (
  pincode: string,
  cartItems: any[]
): Promise<any[]> => {
  try {
    const response = await fetch('/api/shipping-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pincode,
        cartItems,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get shipping rates');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting shipping rates:', error);
    throw error;
  }
};
