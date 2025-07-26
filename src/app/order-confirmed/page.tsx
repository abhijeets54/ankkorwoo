'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Truck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderConfirmedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      // If no order ID, redirect to home
      router.push('/');
      return;
    }
    setOrderId(id);
  }, [searchParams, router]);

  if (!orderId) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Thank You Message */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif mb-4 text-gray-900">
            Thank You for Your Order!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Your order has been successfully placed and is being processed.
          </p>
          
          {/* Order ID */}
          <div className="bg-gray-50 border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-2">Order Details</h2>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono text-lg font-medium text-[#2c2c27]">
                #{orderId}
              </span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="mb-8">
          <h3 className="text-xl font-medium mb-6">What happens next?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Payment Confirmed</h4>
              <p className="text-sm text-gray-600">
                Your payment has been successfully processed
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="font-medium mb-2">Order Processing</h4>
              <p className="text-sm text-gray-600">
                We're preparing your items for shipment
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">On the Way</h4>
              <p className="text-sm text-gray-600">
                Your order will be shipped soon
              </p>
            </div>
          </div>
        </div>

        {/* Order Confirmation Email */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-medium mb-2">Order Confirmation Email</h3>
          <p className="text-sm text-gray-600">
            We've sent an order confirmation email with your order details and tracking information.
            Please check your inbox and spam folder.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => router.push('/')}
            className="w-full md:w-auto bg-[#2c2c27] hover:bg-[#3c3c37] text-white px-8 py-3"
          >
            Continue Shopping
          </Button>
          
          <div className="text-center">
            <button
              onClick={() => router.push('/account')}
              className="text-[#2c2c27] hover:underline text-sm"
            >
              View Order History
            </button>
          </div>
        </div>

        {/* Support Information */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="font-medium mb-4">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">
            If you have any questions about your order, please don't hesitate to contact us.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Email:</span>{' '}
              <a href="mailto:support@ankkor.com" className="text-[#2c2c27] hover:underline">
                support@ankkor.com
              </a>
            </p>
            <p>
              <span className="font-medium">Phone:</span>{' '}
              <a href="tel:+1234567890" className="text-[#2c2c27] hover:underline">
                +91 12345 67890
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
