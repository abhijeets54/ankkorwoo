'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useCheckoutStore } from '@/lib/checkoutStore';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function TestCheckoutFlowPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCustomer();
  const cartStore = useLocalCartStore();
  const checkoutStore = useCheckoutStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Check authentication and cart
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/sign-in?redirect=/test-checkout-flow');
      return;
    }

    // If cart is empty, use sample data for testing
    let cartItems = cartStore.items;
    if (cartItems.length === 0) {
      // Create sample cart item - Product 69 is actually a simple product, not a variation
      // So we don't need variationId at all
      const sampleItem = {
        id: 'test-69',
        productId: '69',  // Product ID 69 is ELEGANT LILAC - L (simple product)
        name: 'ELEGANT LILAC - L',
        price: 1522,
        quantity: 1,
        image: {
          url: 'https://maroon-lapwing-781450.hostingersite.com/wp-content/uploads/2025/07/I29A9504-scaled-e1752127096160.jpg',
          alt: 'ELEGANT LILAC'
        },
        attributes: [
          { name: 'Size', value: 'L' }
        ]
      };
      cartItems = [sampleItem];
      console.log('Using sample cart data for testing:', JSON.stringify(sampleItem, null, 2));
    }

    // Set cart data in checkout store
    console.log('Setting cart items in checkout store:', JSON.stringify(cartItems, null, 2));
    checkoutStore.setCart(cartItems);

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
  }, [cartStore.items, router, isAuthenticated, isLoading]);

  const handleTestCheckout = async () => {
    setIsSubmitting(true);
    setResult(null);
    checkoutStore.setError(null);

    try {
      // Wait for shipping to load
      if (!checkoutStore.selectedShipping) {
        throw new Error('Waiting for shipping calculation...');
      }

      console.log('Creating test order (simulating successful payment)...');

      // Simulate Razorpay payment response
      const mockPaymentResponse = {
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_order_id: `order_test_${Date.now()}`,
        razorpay_signature: 'test_signature_' + Math.random().toString(36)
      };

      console.log('Calling test-order API with data...');
      console.log('Cart items:', JSON.stringify(checkoutStore.cart, null, 2));

      // Call the verify-payment endpoint directly
      // NOTE: This will fail signature verification, so we'll use a test endpoint instead
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
      console.log('Order creation response:', data);

      if (data.success) {
        setResult({
          success: true,
          orderId: data.orderId,
          message: 'Order created successfully!'
        });

        // Clear cart
        cartStore.clearCart();
        checkoutStore.clearCheckout();

        // Redirect to order confirmation page
        setTimeout(() => {
          console.log('Redirecting to order confirmation...');
          router.push(`/order-confirmed?id=${data.orderId}`);
        }, 1500);
      } else {
        throw new Error(data.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Test checkout error:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to create order'
      });
      checkoutStore.setError(error.message);
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

  // Will redirect in useEffect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif mb-4">Test Checkout Flow</h1>
        <p className="text-gray-600 mb-8">
          This page simulates the complete checkout flow. It uses your cart items if available,
          or sample product data for testing. Payment step is skipped for testing.
        </p>

        {cartStore.items.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your cart is empty, so we're using sample product data (Product ID: 69) for testing.
            </p>
          </div>
        )}

        {/* Cart Items */}
        <div className="bg-white p-6 border rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-medium mb-4">Your Cart</h2>

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
                    ₹{typeof item.price === 'string'
                      ? parseFloat(item.price.replace(/[₹$€£,]/g, '').trim()).toFixed(2)
                      : item.price.toFixed(2)} × {item.quantity}
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

        {/* Shipping Address */}
        <div className="bg-white p-6 border rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-medium mb-4">Shipping Address</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Name:</strong> Test User</p>
            <p><strong>Address:</strong> 123 Test Street, Apt 4B</p>
            <p><strong>City:</strong> Mumbai, Maharashtra</p>
            <p><strong>Pincode:</strong> 400001</p>
            <p><strong>Phone:</strong> 9876543210</p>
          </div>
        </div>

        {/* Error Display */}
        {checkoutStore.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {checkoutStore.error}
          </div>
        )}

        {/* Create Order Button */}
        <Button
          onClick={handleTestCheckout}
          disabled={isSubmitting || checkoutStore.isLoadingShipping || !checkoutStore.selectedShipping}
          className="w-full py-6 bg-[#2c2c27] hover:bg-[#3c3c37] text-white mb-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Order...
            </>
          ) : (
            `Complete Order (Test Mode) - ₹${checkoutStore.finalAmount.toFixed(2)}`
          )}
        </Button>

        {/* Result Display */}
        {result && (
          <div className={`mb-6 p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <p className="font-medium mb-2">
              {result.success ? '✓ Success!' : '✗ Error'}
            </p>
            <p className="text-sm">{result.message}</p>
            {result.orderId && (
              <div className="mt-3 space-y-1">
                <p className="text-sm">
                  <strong>Order ID:</strong> {result.orderId}
                </p>
                <p className="text-sm">
                  Redirecting to order confirmation...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium mb-2">Test Mode</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Uses your actual cart items</li>
            <li>Creates real order in WooCommerce</li>
            <li>Skips Razorpay payment (for testing)</li>
            <li>Order will be associated with your account</li>
            <li>You'll be redirected to order confirmation page</li>
            <li>Order will appear in your account orders tab</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
