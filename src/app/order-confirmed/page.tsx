'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Truck, CreditCard, Loader2, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderDetails {
  id: string;
  databaseId: number;
  date: string;
  status: string;
  total: string;
  subtotal?: string;
  shippingTotal?: string;
  totalTax?: string;
  paymentMethodTitle?: string;
  billing?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  lineItems: {
    nodes: Array<{
      product: {
        node: {
          id: string;
          name: string;
          image?: {
            sourceUrl: string;
            altText: string;
          };
        };
      };
      quantity: number;
      total: string;
    }>;
  };
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function OrderConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      // If no order ID, redirect to home
      router.push('/');
      return;
    }
    setOrderId(id);
    fetchOrderDetails(id);
  }, [searchParams, router]);

  const fetchOrderDetails = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try GraphQL endpoint first
      let response = await fetch(`/api/orders/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // If GraphQL fails (e.g., authentication issues), try REST API endpoint
      if (!response.ok) {
        console.log('GraphQL endpoint failed, trying REST API endpoint...');
        response = await fetch(`/api/orders-rest/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      if (data.success && data.order) {
        setOrderDetails(data.order);
      } else {
        throw new Error(data.message || 'Order not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!orderId) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Thank You Message */}
        <div className="text-center mb-8">
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
            {orderDetails && (
              <div className="mt-4 text-sm text-gray-600">
                <p>Order Date: {new Date(orderDetails.date).toLocaleDateString()}</p>
                <p>Status: <span className="capitalize font-medium">{orderDetails.status}</span></p>
                {orderDetails.paymentMethodTitle && (
                  <p>Payment Method: {orderDetails.paymentMethodTitle}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading order details...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Detailed Order Information */}
        {orderDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Order Items */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Order Items
              </h3>
              <div className="space-y-4">
                {orderDetails.lineItems.nodes.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                    {item.product.node.image && (
                      <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={item.product.node.image.sourceUrl}
                          alt={item.product.node.image.altText || item.product.node.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product.node.name}</p>
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity} × ₹{(parseFloat(item.total || '0') / item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ₹{parseFloat(item.total || '0').toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>₹{parseFloat(orderDetails.subtotal || '0').toFixed(2)}</span>
                </div>
                {orderDetails.shippingTotal && parseFloat(orderDetails.shippingTotal) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span>₹{parseFloat(orderDetails.shippingTotal).toFixed(2)}</span>
                  </div>
                )}
                {orderDetails.totalTax && parseFloat(orderDetails.totalTax) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span>₹{parseFloat(orderDetails.totalTax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-medium pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{parseFloat(orderDetails.total || '0').toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping & Billing Info */}
            <div className="space-y-6">
              {/* Billing Address */}
              {orderDetails.billing && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-xl font-medium mb-4 flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Billing Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{orderDetails.billing.firstName} {orderDetails.billing.lastName}</p>
                    <p className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      {orderDetails.billing.address1}
                      {orderDetails.billing.address2 && `, ${orderDetails.billing.address2}`}
                    </p>
                    <p className="ml-5">{orderDetails.billing.city}, {orderDetails.billing.state} {orderDetails.billing.postcode}</p>
                    <p className="ml-5">{orderDetails.billing.country}</p>
                    {orderDetails.billing.phone && (
                      <p className="flex items-center">
                        <Phone className="w-4 h-4 mr-1 text-gray-400" />
                        {orderDetails.billing.phone}
                      </p>
                    )}
                    <p className="flex items-center">
                      <Mail className="w-4 h-4 mr-1 text-gray-400" />
                      {orderDetails.billing.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {orderDetails.shipping && orderDetails.shipping.address1 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-xl font-medium mb-4 flex items-center">
                    <Truck className="mr-2 h-5 w-5" />
                    Shipping Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{orderDetails.shipping.firstName} {orderDetails.shipping.lastName}</p>
                    <p className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      {orderDetails.shipping.address1}
                      {orderDetails.shipping.address2 && `, ${orderDetails.shipping.address2}`}
                    </p>
                    <p className="ml-5">{orderDetails.shipping.city}, {orderDetails.shipping.state} {orderDetails.shipping.postcode}</p>
                    <p className="ml-5">{orderDetails.shipping.country}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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

// Main page component with Suspense boundary
export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-12 px-4"><div className="text-center">Loading...</div></div>}>
      <OrderConfirmedContent />
    </Suspense>
  );
}