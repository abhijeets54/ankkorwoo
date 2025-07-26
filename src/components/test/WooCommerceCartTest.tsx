'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import * as woocommerce from '@/lib/woocommerce';
import { useLocalCartStore } from '@/lib/localCartStore';

/**
 * Component to test WooCommerce cart functionality
 */
export default function WooCommerceCartTest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<any>(null);
  const [productId, setProductId] = useState<string>('');
  
  // Get cart store functions
  const {
    items,
    itemCount,
    addToCart,
    removeCartItem,
    clearCart
  } = useLocalCartStore();
  
  // Handle creating an empty cart
  const handleCreateEmptyCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newCart = await woocommerce.createCart();
      
      if (newCart) {
        setCart(newCart);
        console.log('Empty cart created:', newCart);
      } else {
        throw new Error('Failed to create cart');
      }
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cart');
      setLoading(false);
    }
  };
  
  // Handle adding a product to cart
  const handleAddToCart = async () => {
    if (!productId) {
      setError('Please enter a product ID');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await addToCart({
        productId,
        quantity: 1,
        name: 'Test Product', // This will be overwritten by the actual product name
        price: '0', // This will be updated with the actual price
      });
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item to cart');
      setLoading(false);
    }
  };
  
  // Handle clearing the cart
  const handleClearCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await clearCart();
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">WooCommerce Cart Test</h1>
      
      {loading && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded">
          Loading...
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Cart State</h2>
        <div className="p-3 bg-gray-50 rounded mb-2">
          <p>Cart ID: {cartId || 'Not initialized'}</p>
          <p>Item Count: {itemCount}</p>
        </div>
        
        <h3 className="font-medium mt-3 mb-1">Items in Cart:</h3>
        {items.length === 0 ? (
          <p className="text-gray-500">No items in cart</p>
        ) : (
          <ul className="list-disc pl-5">
            {items.map(item => (
              <li key={item.id} className="mb-2">
                {item.name} - Quantity: {item.quantity} - Price: ₹{parseFloat(item.price).toFixed(2)}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => removeCartItem(item.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-3">Create Empty Cart</h2>
          <Button 
            onClick={handleCreateEmptyCart}
            disabled={loading}
            className="w-full"
          >
            Create Empty Cart
          </Button>
          
          {cart && (
            <div className="mt-3 p-2 bg-green-50 rounded">
              <p>Cart created successfully!</p>
              <p>Cart ID: {cart.id}</p>
              <p>Is Empty: {cart.isEmpty ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-3">Add Item to Cart</h2>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Product ID:
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="Enter product ID"
              />
            </label>
          </div>
          <Button 
            onClick={handleAddToCart}
            disabled={loading || !productId}
            className="w-full"
          >
            Add to Cart
          </Button>
        </div>
      </div>
      
      <Button
        variant="destructive"
        onClick={handleClearCart}
        disabled={loading || items.length === 0}
        className="mt-2"
      >
        Clear Cart
      </Button>
    </div>
  );
} 