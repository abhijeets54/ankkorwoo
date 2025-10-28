'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useCheckoutStore } from '@/lib/checkoutStore';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function TestCheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCustomer();
  const cartStore = useLocalCartStore();
  const checkoutStore = useCheckoutStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Initialize cart data in checkout store
  useEffect(() => {
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

    // Set a test shipping address
    checkoutStore.setShippingAddress({
      firstName: 'Test',
      lastName: 'User',
      address1: '123 Test Street',
      address2: 'Apt 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9876543210'
    });

    // Fetch shipping rates
    checkoutStore.fetchShippingRates('400001', 'Maharashtra');
  }, [cartStore.items, router, isAuthenticated]);

  const handleTestOrder = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      // Wait for shipping to load
      if (!checkoutStore.selectedShipping) {
        throw new Error('Waiting for shipping calculation...');
      }

      console.log('Creating test order with:', {
        address: checkoutStore.shippingAddress,
        cartItems: checkoutStore.cart,
        shipping: checkoutStore.selectedShipping
      });

      const response = await fetch('/api/test-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: checkoutStore.shippingAddress,
          cartItems: checkoutStore.cart,
          shipping: checkoutStore.selectedShipping,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          orderId: data.orderId,
          message: 'Test order created successfully!'
        });

        // Clear cart
        cartStore.clearCart();
        checkoutStore.clearCheckout();

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push(`/order-confirmed?id=${data.orderId}`);
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.message || 'Failed to create test order'
        });
      }
    } catch (error: any) {
      console.error('Test order error:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to create test order'
      });
    } finally {
      setIsSubmitting(false);
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif mb-4">Test Checkout (No Payment)</h1>
        <p className="text-gray-600 mb-8">
          This page will create a test order in WooCommerce without requiring payment.
          Use this to test the order creation and fetching flow.
        </p>

        {/* Order Summary */}
        <div className="bg-white p-6 border rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-medium mb-4">Order Summary</h2>

          <div className="space-y-4 mb-4">
            {checkoutStore.cart.map(item => (
              <div key={item.id} className="flex gap-4 py-3 border-b border-gray-100 last:border-b-0">
                {item.image?.url && (
                  <div className="relative h-16 w-16 bg-gray-100 flex-shrink-0 rounded-lg overflow-hidden">
                    <img
                      src={item.image.url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{item.name}</h3>
                  {item.attributes && item.attributes.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {item.attributes.map(attr => `${attr.name}: ${attr.value}`).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    {typeof item.price === 'string' ? item.price : `₹${item.price}`} × {item.quantity}
                  </p>
                </div>
                <div className="text-sm font-medium">
                  ₹{(
                    (typeof item.price === 'string'
                      ? parseFloat(item.price.replace(/[₹$€£,]/g, '').trim())
                      : item.price) * item.quantity
                  ).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 space-y-2 border-t">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>₹{checkoutStore.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span>
                {checkoutStore.isLoadingShipping ? (
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : checkoutStore.selectedShipping ? (
                  checkoutStore.selectedShipping.cost === 0
                    ? 'Free'
                    : `₹${checkoutStore.selectedShipping.cost.toFixed(2)}`
                ) : (
                  'Calculating...'
                )}
              </span>
            </div>
            <div className="flex justify-between text-lg font-medium pt-2 border-t">
              <span>Total</span>
              <span>₹{checkoutStore.finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Test Shipping Address */}
        <div className="bg-white p-6 border rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-medium mb-4">Test Shipping Address</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Name:</strong> Test User</p>
            <p><strong>Address:</strong> 123 Test Street, Apt 4B</p>
            <p><strong>City:</strong> Mumbai, Maharashtra</p>
            <p><strong>Pincode:</strong> 400001</p>
            <p><strong>Phone:</strong> 9876543210</p>
          </div>
        </div>

        {/* Create Test Order Button */}
        <Button
          onClick={handleTestOrder}
          disabled={isSubmitting || checkoutStore.isLoadingShipping || !checkoutStore.selectedShipping}
          className="w-full py-6 bg-[#2c2c27] hover:bg-[#3c3c37] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Test Order...
            </>
          ) : (
            `Create Test Order - ₹${checkoutStore.finalAmount.toFixed(2)}`
          )}
        </Button>

        {/* Result Display */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <p className="font-medium mb-2">
              {result.success ? '✓ Success!' : '✗ Error'}
            </p>
            <p className="text-sm">{result.message}</p>
            {result.orderId && (
              <p className="text-sm mt-2">
                <strong>Order ID:</strong> {result.orderId}
              </p>
            )}
            {result.success && (
              <p className="text-sm mt-2">
                Redirecting to order confirmation page...
              </p>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This is a test endpoint that creates orders without payment.
            The order will be marked as "Processing" in WooCommerce and should appear in your
            account order history.
          </p>
        </div>
      </div>
    </div>
  );
}
