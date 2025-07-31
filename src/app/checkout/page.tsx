'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useCheckoutStore, ShippingAddress } from '@/lib/checkoutStore';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { loadRazorpayScript, createRazorpayOrder, initializeRazorpayCheckout, verifyRazorpayPayment } from '@/lib/razorpay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Truck, CreditCard } from 'lucide-react';
import StateCitySelector from '@/components/checkout/StateCitySelector';
import { getLocationFromPincode } from '@/lib/locationUtils';

interface CheckoutFormData {
  firstName: string;
  lastName: string;
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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutFormData>({
    mode: 'onChange'
  });

  // Register state and city fields for validation
  useEffect(() => {
    register('state', { required: 'State is required' });
    register('city', { required: 'City is required' });
  }, [register]);

  // Watch form fields for shipping rate fetching
  const pincode = watch('pincode');
  const state = watch('state');
  const city = watch('city');

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

  // Fetch shipping rates when state changes (regardless of other fields)
  useEffect(() => {
    if (state && isAuthenticated) {
      checkoutStore.fetchShippingRates(pincode || '000000', state);
    }
  }, [state, isAuthenticated]); // Only watch state and auth status



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

    try {
      // Validate Razorpay configuration
      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKeyId || razorpayKeyId === 'rzp_test_your_key_id_here') {
        throw new Error('Payment gateway not configured. Please contact support.');
      }

      // Create Razorpay order
      console.log('Creating Razorpay order for amount:', checkoutStore.finalAmount);
      const razorpayOrder = await createRazorpayOrder(
        checkoutStore.finalAmount,
        `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        {
          customer_phone: checkoutStore.shippingAddress.phone,
          customer_name: `${checkoutStore.shippingAddress.firstName} ${checkoutStore.shippingAddress.lastName}`,
          shipping_method: checkoutStore.selectedShipping.name,
        }
      );

      console.log('Razorpay order created:', razorpayOrder.id);

      // Initialize Razorpay checkout
      await initializeRazorpayCheckout({
        key: razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Ankkor',
        description: `Order Payment - ${checkoutStore.cart.length} item(s)`,
        order_id: razorpayOrder.id,
        handler: async (response) => {
          // Verify payment and create order
          console.log('Payment successful, verifying...', response);
          checkoutStore.setError(null);

          try {
            const verificationResult = await verifyRazorpayPayment(response, {
              address: checkoutStore.shippingAddress,
              cartItems: checkoutStore.cart,
              shipping: checkoutStore.selectedShipping,
            });

            console.log('Payment verification result:', verificationResult);

            if (verificationResult.success) {
              // Clear cart and checkout state
              cartStore.clearCart();
              checkoutStore.clearCheckout();

              // Redirect to order confirmation
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
          name: `${checkoutStore.shippingAddress.firstName} ${checkoutStore.shippingAddress.lastName}`,
          contact: checkoutStore.shippingAddress.phone,
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
                  onStateChange={(newState) => setValue('state', newState)}
                  onCityChange={(newCity) => setValue('city', newCity)}
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

              <Button
                type="submit"
                className="mt-4 w-full bg-[#2c2c27] hover:bg-[#3c3c37] text-white"
              >
                Save Address & Continue
              </Button>
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
              Payment
            </h2>

            <div className="space-y-4">
              <div className="flex items-center p-4 border rounded-lg">
                <input
                  type="radio"
                  id="razorpay"
                  name="payment"
                  checked={true}
                  readOnly
                  className="mr-3"
                />
                <div>
                  <label htmlFor="razorpay" className="font-medium">Razorpay</label>
                  <p className="text-sm text-gray-600">Pay securely with credit card, debit card, UPI, or net banking</p>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full py-6 bg-[#2c2c27] hover:bg-[#3c3c37] text-white"
                disabled={isSubmitting || !checkoutStore.shippingAddress || !checkoutStore.selectedShipping || checkoutStore.isProcessingPayment}
              >
                {isSubmitting || checkoutStore.isProcessingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
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
              {checkoutStore.cart.map(item => (
                <div key={item.id} className="flex gap-4 py-2 border-b">
                  {item.image?.url && (
                    <div className="relative h-16 w-16 bg-gray-100 flex-shrink-0">
                      <img
                        src={item.image.url}
                        alt={item.name}
                        className="h-full w-full object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      ₹{typeof item.price === 'string' ? parseFloat(item.price).toFixed(2) : item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    ₹{(typeof item.price === 'string' ? parseFloat(item.price) * item.quantity : item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}

              <div className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{checkoutStore.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>
                    {!state
                      ? 'Select state'
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