'use client';

import { useState, useEffect } from 'react';
import { useLocalCartStore } from '@/lib/localCartStore';
import { cartSession } from '@/lib/cartSession';
import { fetchNonce, syncCartToWoo } from '@/lib/storeApi';

export default function WooCommerceCartTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const cart = useLocalCartStore();

  // Add a test product to the cart
  const addTestProduct = () => {
    cart.addToCart({
      productId: '123', // Replace with a valid product ID from your WooCommerce store
      name: 'Test Product',
      price: '99.99',
      quantity: 1,
      image: {
        url: '/shirt.png',
        altText: 'Test Product'
      }
    });
    setSuccess('Test product added to cart');
  };

  // Sync cart with WooCommerce and redirect to checkout
  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Debug cart session
      cartSession.debugToken();
      
      // Get checkout URL and redirect
      const checkoutUrl = await cart.syncWithWooCommerce();
      
      if (checkoutUrl) {
        setSuccess(`Cart synced successfully. Redirecting to: ${checkoutUrl}`);
        
        // Redirect after a short delay to show the success message
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 2000);
      } else {
        throw new Error('Failed to get checkout URL');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  // Test direct API call to WooCommerce
  const testDirectApiCall = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!baseUrl) {
        throw new Error('WooCommerce URL not configured');
      }
      
      // Fetch nonce
      const nonce = await fetchNonce();
      console.log('Fetched nonce:', nonce);
      
      // Get cart items
      const items = cart.items;
      if (items.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // Sync cart with WooCommerce
      const cartResponse = await syncCartToWoo(nonce, items);
      console.log('Cart sync response:', cartResponse);
      
      // Check WooCommerce session cookie
      const wooSessionCookie = cartSession.getWooCommerceSessionCookie();
      
      // Set debug info
      setDebugInfo({
        nonce,
        cartItems: items,
        cartResponse,
        wooSessionCookie
      });
      
      setSuccess('Direct API call successful');
    } catch (error) {
      console.error('API error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during API call');
    } finally {
      setLoading(false);
    }
  };

  // Clear the cart
  const clearCart = () => {
    cart.clearCart();
    setSuccess('Cart cleared');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">WooCommerce Cart Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Cart Contents</h2>
        {cart.items.length === 0 ? (
          <p>Cart is empty</p>
        ) : (
          <div>
            <p>Items: {cart.items.length}</p>
            <ul className="list-disc pl-5">
              {cart.items.map(item => (
                <li key={item.id}>
                  {item.name} - Quantity: {item.quantity} - Price: ${item.price}
                </li>
              ))}
            </ul>
            <p className="mt-2">Subtotal: ${cart.subtotal().toFixed(2)}</p>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={addTestProduct}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Test Product
        </button>
        
        <button 
          onClick={handleCheckout}
          disabled={loading || cart.items.length === 0}
          className={`px-4 py-2 ${loading || cart.items.length === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded`}
        >
          {loading ? 'Processing...' : 'Proceed to Checkout'}
        </button>
        
        <button 
          onClick={testDirectApiCall}
          disabled={loading || cart.items.length === 0}
          className={`px-4 py-2 ${loading || cart.items.length === 0 ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded`}
        >
          Test Direct API Call
        </button>
        
        <button 
          onClick={clearCart}
          disabled={loading || cart.items.length === 0}
          className={`px-4 py-2 ${loading || cart.items.length === 0 ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white rounded`}
        >
          Clear Cart
        </button>
      </div>
      
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 bg-green-50 border border-green-200 text-green-700 rounded">
          <strong>Success:</strong> {success}
        </div>
      )}
      
      {debugInfo && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Debug Information</h2>
          <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 