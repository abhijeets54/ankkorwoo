'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { Button } from '@/components/ui/button';
import { Loader2, Package, MapPin, User } from 'lucide-react';

export default function SimpleTestOrderPage() {
  const router = useRouter();
  const { isAuthenticated, customer } = useCustomer();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Sample cart items for testing
  const sampleCartItems = [
    {
      id: 'test-1',
      productId: '69', // Real product ID from your WooCommerce store
      name: 'Test Product',
      price: 999,
      quantity: 1,
      image: {
        url: 'https://via.placeholder.com/150',
        alt: 'Test Product'
      },
      attributes: [
        { name: 'Size', value: 'M' }
      ]
    }
  ];

  // Sample shipping address
  const sampleAddress = {
    firstName: 'Test',
    lastName: 'User',
    address1: '123 Test Street',
    address2: 'Apt 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '9876543210'
  };

  // Sample shipping option
  const sampleShipping = {
    id: 'flat_rate',
    name: 'Standard Shipping',
    cost: 0
  };

  const handleTestOrder = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      console.log('Creating test order with:', {
        address: sampleAddress,
        cartItems: sampleCartItems,
        shipping: sampleShipping
      });

      const response = await fetch('/api/test-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: sampleAddress,
          cartItems: sampleCartItems,
          shipping: sampleShipping,
        }),
      });

      const data = await response.json();
      console.log('Test order response:', data);

      if (data.success) {
        setResult({
          success: true,
          orderId: data.orderId,
          message: 'Test order created successfully!'
        });

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif mb-4">Simple Test Order</h1>

        {/* Authentication Status */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isAuthenticated
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <p className="text-sm font-medium mb-1">
            {isAuthenticated ? '✓ Authenticated' : '⚠ Not Authenticated'}
          </p>
          {isAuthenticated && customer ? (
            <p className="text-sm text-gray-600">
              Logged in as: {customer.email}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              You can still test order creation, but it won't be linked to your account.
              <a href="/sign-in" className="ml-2 underline text-blue-600">Sign in</a>
            </p>
          )}
        </div>

        {/* Sample Data Display */}
        <div className="bg-white p-6 border rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-medium mb-4 flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Sample Order Data
          </h2>

          <div className="space-y-4">
            {/* Sample Product */}
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-medium text-sm text-gray-700 mb-2">Product:</p>
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">{sampleCartItems[0].name}</p>
                  <p className="text-sm text-gray-600">
                    Size: {sampleCartItems[0].attributes[0].value}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₹{sampleCartItems[0].price} × {sampleCartItems[0].quantity}
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded">
                ✓ Using product ID: {sampleCartItems[0].productId}
              </p>
            </div>

            {/* Sample Address */}
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Shipping Address:
              </p>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Name:</strong> {sampleAddress.firstName} {sampleAddress.lastName}</p>
                <p><strong>Address:</strong> {sampleAddress.address1}, {sampleAddress.address2}</p>
                <p><strong>City:</strong> {sampleAddress.city}, {sampleAddress.state}</p>
                <p><strong>Pincode:</strong> {sampleAddress.pincode}</p>
                <p><strong>Phone:</strong> {sampleAddress.phone}</p>
              </div>
            </div>

            {/* Order Total */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span>₹{sampleCartItems[0].price * sampleCartItems[0].quantity}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Shipping:</span>
                <span>{sampleShipping.cost === 0 ? 'Free' : `₹${sampleShipping.cost}`}</span>
              </div>
              <div className="flex justify-between text-lg font-medium pt-2 border-t">
                <span>Total:</span>
                <span>₹{sampleCartItems[0].price * sampleCartItems[0].quantity + sampleShipping.cost}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Create Test Order Button */}
        <Button
          onClick={handleTestOrder}
          disabled={isSubmitting}
          className="w-full py-6 bg-[#2c2c27] hover:bg-[#3c3c37] text-white mb-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Test Order...
            </>
          ) : (
            'Create Test Order in WooCommerce'
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
                  Redirecting to order confirmation page...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-2">What This Does:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Creates a test order in WooCommerce backend</li>
            <li>Order status: Processing (marked as paid)</li>
            <li>Payment method: "Test Order (No Payment)"</li>
            <li>No actual payment is processed</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium mb-2">After Order Creation:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Check order confirmation page for order details</li>
            <li>Go to <a href="/account" className="underline text-blue-600">/account</a> to see order in history (if logged in)</li>
            <li>Check WooCommerce backend (wp-admin → WooCommerce → Orders)</li>
          </ul>
        </div>

        {/* Edit Instructions */}
        <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
          <h3 className="font-medium mb-2 text-sm">To Use Your Own Product:</h3>
          <p className="text-xs text-gray-600 mb-2">
            Edit this file at: <code className="bg-white px-2 py-1 rounded">src/app/test-order-simple/page.tsx</code>
          </p>
          <p className="text-xs text-gray-600">
            Change <code className="bg-white px-1 rounded">productId: '1234'</code> to a valid product ID from your WooCommerce store.
          </p>
        </div>
      </div>
    </div>
  );
}
