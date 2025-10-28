'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useCheckoutStore, ShippingAddress } from '@/lib/checkoutStore';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { loadRazorpayScript, createRazorpayOrder, verifyRazorpayPayment } from '@/lib/razorpay';
import { getCODOrderBreakdown } from '@/lib/codPrepayment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Truck, CreditCard, Package } from 'lucide-react';
import StateCitySelector from '@/components/checkout/StateCitySelector';
import { getLocationFromPincode } from '@/lib/locationUtils';
import { CartSizeUtils } from '@/lib/cartSizeUtils';

interface CheckoutFormData {
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

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCustomer();
  const cartStore = useLocalCartStore();
  const checkoutStore = useCheckoutStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'cod_prepaid'>('online');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutFormData>({
    mode: 'onChange'
  });

  // Register state and city fields for validation
  useEffect(() => {
    register('state', { required: 'State is required' });
    register('city', { required: 'City is required' });
  }, [register]);

  // Watch form fields for shipping rate fetching and button state
  const pincode = watch('pincode');
  const state = watch('state');
  const city = watch('city');
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const email = watch('email');
  const address1 = watch('address1');
  const phone = watch('phone');

  // Memoized handlers to prevent infinite re-renders
  const handleStateChange = useCallback((newState: string) => {
    setValue('state', newState);
  }, [setValue]);

  const handleCityChange = useCallback((newCity: string) => {
    setValue('city', newCity);
  }, [setValue]);

  // Initialize cart data in checkout store
  useEffect(() => {
    // Check authentication first
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    if (cartStore.items.length === 0) {
      router.push('/');
      return;
    }

    // Set cart data in checkout store
    checkoutStore.setCart(cartStore.items);
  }, [cartStore.items, router, isAuthenticated]); // Removed checkoutStore from dependencies

  // Load Razorpay script on component mount
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // Fetch shipping rates when state or cart changes
  useEffect(() => {
    if (state && isAuthenticated && checkoutStore.cart.length > 0) {

      checkoutStore.fetchShippingRates(pincode || '000000', state);
    }
  }, [state, isAuthenticated, checkoutStore.subtotal, checkoutStore.cart.length]); // Watch state, auth, and cart changes



  // Auto-fill state and city when pincode is entered
  useEffect(() => {
    if (pincode && pincode.length === 6) {
      const fetchLocationFromPincode = async () => {
        try {
          const locationData = await getLocationFromPincode(pincode);
          if (locationData.state) {
            setValue('state', locationData.state);
            // Trigger shipping calculation with the new state
            if (isAuthenticated) {
              checkoutStore.fetchShippingRates(pincode, locationData.state);
            }
          }
          if (locationData.city) {
            setValue('city', locationData.city);
          }
        } catch (error) {
          console.error('Error fetching location from pincode:', error);
          // Don't show error for pincode lookup failure
        }
      };

      fetchLocationFromPincode();
    }
  }, [pincode, setValue, isAuthenticated]);



  const onSubmit = async (data: CheckoutFormData) => {
    // Set shipping address in store
    const shippingAddress: ShippingAddress = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      phone: data.phone,
    };

    checkoutStore.setShippingAddress(shippingAddress);
  };

  const handlePayment = async () => {
    // Get current form values and save to store before validation
    const formValues = watch();

    // Ensure shipping address is saved to store from form values
    if (formValues.firstName && formValues.lastName && formValues.email && formValues.address1 &&
        formValues.city && formValues.state && formValues.pincode && formValues.phone) {
      const shippingAddress: ShippingAddress = {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        address2: formValues.address2,
        address1: formValues.address1,
        city: formValues.city,
        state: formValues.state,
        pincode: formValues.pincode,
        phone: formValues.phone,
      };
      checkoutStore.setShippingAddress(shippingAddress);
    }

    // Validate all required fields
    if (!checkoutStore.shippingAddress) {
      checkoutStore.setError('Please fill in your shipping address');
      return;
    }

    if (!checkoutStore.selectedShipping) {
      checkoutStore.setError('Shipping cost not calculated. Please enter a valid pincode.');
      return;
    }

    if (checkoutStore.cart.length === 0) {
      checkoutStore.setError('Your cart is empty');
      return;
    }

    if (checkoutStore.finalAmount <= 0) {
      checkoutStore.setError('Invalid order amount');
      return;
    }

    setIsSubmitting(true);
    checkoutStore.setProcessingPayment(true);
    checkoutStore.setError(null);

    // ✅ SECURITY: Validate stock for all cart items before payment
    try {
      const { validateStockBeforeAddToCart } = await import('@/lib/woocommerce');
      const stockIssues: string[] = [];

      for (const item of checkoutStore.cart) {
        const validation = await validateStockBeforeAddToCart({
          productId: item.productId,
          variationId: item.variationId,
          requestedQuantity: item.quantity
        });

        if (!validation.isValid) {
          stockIssues.push(
            `${item.name}${item.attributes?.length ? ` (${item.attributes.map(a => a.value).join(', ')})` : ''}: ${validation.message || 'Out of stock'}`
          );
        }
      }

      if (stockIssues.length > 0) {
        setIsSubmitting(false);
        checkoutStore.setProcessingPayment(false);
        checkoutStore.setError(
          `Cannot proceed to payment. Please update your cart:\n\n${stockIssues.join('\n')}`
        );
        return;
      }

      console.log('Stock validation passed for all items');
    } catch (error: any) {
      console.error('Stock validation error:', error);
      setIsSubmitting(false);
      checkoutStore.setProcessingPayment(false);
      checkoutStore.setError('Unable to verify stock availability. Please try again.');
      return;
    }

    try {
      // Validate Razorpay configuration
      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKeyId || razorpayKeyId === 'rzp_test_your_key_id_here') {
        throw new Error('Payment gateway not configured. Please contact support.');
      }

      // Handle different payment methods
      if (selectedPaymentMethod === 'cod_prepaid') {
        await handleCODPrepayment(razorpayKeyId);
      } else {
        await handleOnlinePayment(razorpayKeyId);
      }

    } catch (error: any) {
      console.error('Payment error:', error);

      let errorMessage = 'Payment failed. Please try again.';

      if (error.message?.includes('not configured')) {
        errorMessage = error.message;
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('amount')) {
        errorMessage = 'Invalid amount. Please refresh and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      checkoutStore.setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      checkoutStore.setProcessingPayment(false);
    }
  };

  const handleOnlinePayment = async (razorpayKeyId: string) => {
    // Create Razorpay order for full amount
    console.log('Creating Razorpay order for amount:', checkoutStore.finalAmount);
    const razorpayOrder = await createRazorpayOrder(
      checkoutStore.finalAmount,
      `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      {
        customer_phone: checkoutStore.shippingAddress!.phone,
        customer_name: `${checkoutStore.shippingAddress!.firstName} ${checkoutStore.shippingAddress!.lastName}`,
        shipping_method: checkoutStore.selectedShipping!.name,
        payment_method: 'online',
        // Store complete order data for webhook backup
        order_data: JSON.stringify({
          address: checkoutStore.shippingAddress,
          cartItems: checkoutStore.cart,
          shipping: checkoutStore.selectedShipping,
          customerId: customer?.databaseId || null
        })
      }
    );

    console.log('Razorpay order created:', razorpayOrder.id);

    // Initialize Razorpay checkout
    if (typeof window === 'undefined' || !window.Razorpay) {
      throw new Error('Razorpay SDK not loaded');
    }

    const razorpayInstance = new window.Razorpay({
      key: razorpayKeyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'Ankkor',
      description: `Full Payment - ${checkoutStore.cart.length} item(s)`,
      order_id: razorpayOrder.id,
      handler: async (response: any) => {
        // Verify payment and create order
        console.log('Payment successful, verifying...', response);
        checkoutStore.setError(null);

        try {
          console.log('Calling verify payment API...');
          const verificationResult = await verifyRazorpayPayment(response, {
            address: checkoutStore.shippingAddress,
            cartItems: checkoutStore.cart,
            shipping: checkoutStore.selectedShipping,
          });

          console.log('Payment verification result:', verificationResult);

          if (verificationResult.success) {
            console.log('Payment verified successfully, order created:', verificationResult.orderId);

            // Clear cart and checkout state
            cartStore.clearCart();
            checkoutStore.clearCheckout();

            // Redirect to order confirmation
            console.log('Redirecting to order confirmation page...');
            router.push(`/order-confirmed?id=${verificationResult.orderId}`);
          } else {
            throw new Error(verificationResult.message || 'Payment verification failed');
          }
        } catch (error) {
          console.error('Payment verification error:', error);
          checkoutStore.setError(
            error instanceof Error
              ? error.message
              : 'Payment verification failed. Please contact support if amount was deducted.'
          );
        } finally {
          setIsSubmitting(false);
          checkoutStore.setProcessingPayment(false);
        }
      },
      prefill: {
        name: `${checkoutStore.shippingAddress!.firstName} ${checkoutStore.shippingAddress!.lastName}`,
        contact: checkoutStore.shippingAddress!.phone,
      },
      theme: {
        color: '#2c2c27',
      },
      modal: {
        ondismiss: () => {
          console.log('Payment modal dismissed');
          setIsSubmitting(false);
          checkoutStore.setProcessingPayment(false);
        }
      }
    });

    razorpayInstance.open();
  };

  const handleCODPrepayment = async (razorpayKeyId: string) => {
    // Create Razorpay order for ₹100 convenience fee only
    const convenienteFee = 100;
    console.log('Creating COD prepayment order for convenience fee:', convenienteFee);

    const razorpayOrder = await createRazorpayOrder(
      convenienteFee,
      `cod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      {
        customer_phone: checkoutStore.shippingAddress!.phone,
        customer_name: `${checkoutStore.shippingAddress!.firstName} ${checkoutStore.shippingAddress!.lastName}`,
        shipping_method: checkoutStore.selectedShipping!.name,
        payment_method: 'cod_prepaid',
        cod_convenience_fee: 'true',
        // Store complete order data for webhook backup
        order_data: JSON.stringify({
          address: checkoutStore.shippingAddress,
          cartItems: checkoutStore.cart,
          shipping: checkoutStore.selectedShipping,
          customerId: customer?.databaseId || null
        })
      }
    );

    console.log('COD prepayment order created:', razorpayOrder.id);

    // Initialize Razorpay checkout for convenience fee
    if (typeof window === 'undefined' || !window.Razorpay) {
      throw new Error('Razorpay SDK not loaded');
    }

    const razorpayInstance = new window.Razorpay({
      key: razorpayKeyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'Ankkor',
      description: `COD Convenience Fee - ₹${convenienteFee}`,
      order_id: razorpayOrder.id,
      handler: async (response: any) => {
        // Verify COD prepayment and create order
        console.log('COD convenience fee payment successful, verifying...', response);
        checkoutStore.setError(null);

        try {
          console.log('Calling COD verification API...');
          // Use special COD verification endpoint
          const verificationResult = await fetch('/api/razorpay/cod-prepayment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              address: checkoutStore.shippingAddress,
              cartItems: checkoutStore.cart,
              shipping: checkoutStore.selectedShipping,
            }),
          });

          if (!verificationResult.ok) {
            const errorData = await verificationResult.json();
            throw new Error(errorData.message || 'COD prepayment verification failed');
          }

          const data = await verificationResult.json();
          console.log('COD prepayment verification result:', data);

          if (data.success) {
            console.log('COD payment verified successfully, order created:', data.orderId);

            // Clear cart and checkout state
            cartStore.clearCart();
            checkoutStore.clearCheckout();

            // Redirect to order confirmation with COD info
            console.log('Redirecting to order confirmation page...');
            router.push(`/order-confirmed?id=${data.orderId}&cod=true`);
          } else {
            throw new Error(data.message || 'COD prepayment verification failed');
          }
        } catch (error) {
          console.error('COD prepayment verification error:', error);
          checkoutStore.setError(
            error instanceof Error
              ? error.message
              : 'COD prepayment verification failed. Please contact support if amount was deducted.'
          );
        } finally {
          setIsSubmitting(false);
          checkoutStore.setProcessingPayment(false);
        }
      },
      prefill: {
        name: `${checkoutStore.shippingAddress!.firstName} ${checkoutStore.shippingAddress!.lastName}`,
        contact: checkoutStore.shippingAddress!.phone,
      },
      theme: {
        color: '#2c2c27',
      },
      modal: {
        ondismiss: () => {
          console.log('COD prepayment modal dismissed');
          setIsSubmitting(false);
          checkoutStore.setProcessingPayment(false);
        }
      }
    });

    razorpayInstance.open();
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  // Will redirect in useEffect if not authenticated or cart is empty
  if (!isAuthenticated || cartStore.items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif mb-8">Checkout</h1>

      {checkoutStore.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {checkoutStore.error}
        </div>
      )}



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address Form */}
          <div className="bg-white p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-medium mb-4 flex items-center">
              <Truck className="mr-2 h-5 w-5" />
              Shipping Address
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...register('firstName', { required: 'First name is required' })}
                    className={errors.firstName ? 'border-red-300' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...register('lastName', { required: 'Last name is required' })}
                    className={errors.lastName ? 'border-red-300' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...register('email', {
                      required: 'Email address is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Please enter a valid email address'
                      }
                    })}
                    className={errors.email ? 'border-red-300' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address1">Address Line 1</Label>
                  <Input
                    id="address1"
                    {...register('address1', { required: 'Address is required' })}
                    className={errors.address1 ? 'border-red-300' : ''}
                  />
                  {errors.address1 && (
                    <p className="text-sm text-red-500 mt-1">{errors.address1.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input id="address2" {...register('address2')} />
                </div>

                <StateCitySelector
                  selectedState={state || ''}
                  selectedCity={city || ''}
                  onStateChange={handleStateChange}
                  onCityChange={handleCityChange}
                  stateError={errors.state?.message}
                  cityError={errors.city?.message}
                />

                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    {...register('pincode', {
                      required: 'Pincode is required',
                      pattern: {
                        value: /^[0-9]{6}$/,
                        message: 'Please enter a valid 6-digit pincode'
                      }
                    })}
                    className={errors.pincode ? 'border-red-300' : ''}
                    placeholder="Enter 6-digit pincode"
                  />
                  {errors.pincode && (
                    <p className="text-sm text-red-500 mt-1">{errors.pincode.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    {...register('phone', { required: 'Phone number is required' })}
                    className={errors.phone ? 'border-red-300' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* <Button
                type="submit"
                className="mt-4 w-full bg-[#2c2c27] hover:bg-[#3c3c37] text-white"
              >
                Save Address & Continue
              </Button> */}
            </form>
          </div>

          {/* Shipping Information */}
          <div className="bg-white p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-medium mb-4 flex items-center">
              <Truck className="mr-2 h-5 w-5" />
              Shipping Information
            </h2>

            {/* Free shipping reminder */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                🚚 Free shipping on orders above ₹2999
                {checkoutStore.subtotal > 0 && checkoutStore.subtotal <= 2999 && (
                  <span className="ml-2 text-green-600">
                    (Add ₹{(2999 - checkoutStore.subtotal + 1).toFixed(0)} more for free shipping)
                  </span>
                )}
              </p>
            </div>

            {!state ? (
              <div className="text-gray-500 py-4">
                Please select a state to see shipping options
              </div>
            ) : checkoutStore.isLoadingShipping ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Calculating shipping cost...</span>
              </div>
            ) : checkoutStore.selectedShipping ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Standard Shipping</h3>
                    <p className="text-sm text-gray-500">Estimated delivery: 5-7 days</p>
                  </div>
                  <div className="text-lg font-medium">
                    {checkoutStore.selectedShipping.cost === 0 ? 'Free' : `₹${checkoutStore.selectedShipping.cost.toFixed(2)}`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 py-4">
                Unable to calculate shipping for this address
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="bg-white p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-medium mb-4 flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Payment Method
            </h2>

            <div className="space-y-4">
              {/* Online Payment Option */}
              <div 
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === 'online' ? 'border-[#2c2c27] bg-[#2c2c27]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPaymentMethod('online')}
              >
                <input
                  type="radio"
                  id="online"
                  name="payment"
                  checked={selectedPaymentMethod === 'online'}
                  onChange={() => setSelectedPaymentMethod('online')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="online" className="font-medium cursor-pointer">Pay Online</label>
                  <p className="text-sm text-gray-600 mt-1">Pay securely with credit card, debit card, UPI, or net banking</p>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-[#2c2c27]">Total: ₹{checkoutStore.finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* COD Option */}
              <div 
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === 'cod_prepaid' ? 'border-[#2c2c27] bg-[#2c2c27]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPaymentMethod('cod_prepaid')}
              >
                <input
                  type="radio"
                  id="cod_prepaid"
                  name="payment"
                  checked={selectedPaymentMethod === 'cod_prepaid'}
                  onChange={() => setSelectedPaymentMethod('cod_prepaid')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="cod_prepaid" className="font-medium cursor-pointer">Cash on Delivery</label>
                  <p className="text-sm text-gray-600 mt-1">Pay ₹100 convenience fee now, pay order amount on delivery</p>
                  
                  {selectedPaymentMethod === 'cod_prepaid' && checkoutStore.cart.length > 0 && checkoutStore.selectedShipping && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Order Total:</span>
                          <span>₹{checkoutStore.finalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-orange-600 font-medium">
                          <span>COD Convenience Fee:</span>
                          <span>₹100.00</span>
                        </div>
                        <div className="border-t border-yellow-300 pt-2 mt-2">
                          <div className="flex justify-between font-medium text-green-700">
                            <span>Pay Online Now:</span>
                            <span>₹100.00</span>
                          </div>
                          <div className="flex justify-between font-medium text-blue-700">
                            <span>Pay on Delivery:</span>
                            <span>₹{checkoutStore.finalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-[#2c2c27] text-base mt-1 pt-1 border-t border-yellow-300">
                            <span>Total Cost:</span>
                            <span>₹{(checkoutStore.finalAmount + 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full py-6 bg-[#2c2c27] hover:bg-[#3c3c37] text-white"
                disabled={
                  isSubmitting ||
                  !firstName ||
                  !lastName ||
                  !email ||
                  !address1 ||
                  !city ||
                  !state ||
                  !pincode ||
                  !phone ||
                  !checkoutStore.selectedShipping ||
                  checkoutStore.isProcessingPayment ||
                  Object.keys(errors).length > 0
                }
              >
                {isSubmitting || checkoutStore.isProcessingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : selectedPaymentMethod === 'cod_prepaid' ? (
                  'Pay ₹100 Convenience Fee'
                ) : (
                  `Proceed to Pay - ₹${checkoutStore.finalAmount.toFixed(2)}`
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 border rounded-lg shadow-sm sticky top-8">
            <h2 className="text-xl font-medium mb-4">Order Summary</h2>

            <div className="space-y-4">
              {checkoutStore.cart.map(item => {
                // Extract size information from cart item
                const sizeInfo = item.attributes?.find(attr => 
                  ['Size', 'size', 'pa_size', 'product_size'].includes(attr.name)
                );
                const otherAttributes = item.attributes?.filter(attr => 
                  !['Size', 'size', 'pa_size', 'product_size'].includes(attr.name)
                ) || [];

                return (
                  <div key={item.id} className="flex gap-4 py-3 border-b border-gray-100 last:border-b-0">
                    {item.image?.url && (
                      <div className="relative h-16 w-16 bg-gray-100 flex-shrink-0 rounded-lg overflow-hidden">
                        <img
                          src={item.image.url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                        {/* Size badge on image */}
                        {sizeInfo && (
                          <div className="absolute -top-1 -right-1 bg-[#2c2c27] text-[#f4f3f0] text-xs px-1.5 py-0.5 rounded-full font-medium">
                            {CartSizeUtils.formatSizeForDisplay(sizeInfo.value)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </h3>
                      
                      {/* Other attributes */}
                      {otherAttributes.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {otherAttributes.map((attr, index) => (
                            <span key={attr.name}>
                              {attr.name}: {attr.value}
                              {index < otherAttributes.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600">
                          {(() => {
                            const priceValue = typeof item.price === 'string'
                              ? item.price.replace(/[₹$€£,]/g, '').trim()
                              : String(item.price);
                            const numPrice = parseFloat(priceValue);
                            return isNaN(numPrice) ? '₹0.00' : `₹${numPrice.toFixed(2)}`;
                          })()} × {item.quantity}
                        </p>

                        {/* Size-specific info */}
                        {sizeInfo && (
                          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>Size {CartSizeUtils.formatSizeForDisplay(sizeInfo.value)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                          const priceValue = typeof item.price === 'string'
                            ? item.price.replace(/[₹$€£,]/g, '').trim()
                            : String(item.price);
                          const numPrice = parseFloat(priceValue);
                          return isNaN(numPrice) ? '₹0.00' : `₹${(numPrice * item.quantity).toFixed(2)}`;
                        })()}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-500">
                          {item.quantity} items
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{checkoutStore.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="flex items-center gap-1">
                    {!state
                      ? 'Select state'
                      : checkoutStore.isLoadingShipping
                        ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-sm">Updating...</span>
                          </>
                        )
                        : checkoutStore.selectedShipping
                          ? checkoutStore.selectedShipping.cost === 0
                            ? 'Free'
                            : `₹${checkoutStore.selectedShipping.cost.toFixed(2)}`
                          : 'Calculating...'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-lg font-medium pt-2 border-t">
                  <span>Total</span>
                  <span>₹{checkoutStore.finalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}