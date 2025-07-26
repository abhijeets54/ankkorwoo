'use client';

import React from 'react';
import { useLocalCartStore } from '@/lib/localCartStore';

export default function CartTestPage() {
  const cart = useLocalCartStore();
  
  const testAddToCart = () => {
    cart.addToCart({
      productId: '123',
      quantity: 1,
      name: 'Test Product',
      price: '99.99',
      image: {
        url: '/placeholder-product.jpg',
        altText: 'Test Product'
      }
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Cart Test</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testAddToCart}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Test Item to Cart
        </button>
        
        <div>
          <h2 className="text-lg font-semibold">Cart Items ({cart.itemCount})</h2>
          {cart.items.length === 0 ? (
            <p>No items in cart</p>
          ) : (
            <ul className="space-y-2">
              {cart.items.map(item => (
                <li key={item.id} className="border p-2 rounded">
                  <div>{item.name} - ₹{item.price} x {item.quantity}</div>
                  <button 
                    onClick={() => cart.removeCartItem(item.id)}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div>
          <p>Subtotal: ₹{cart.subtotal().toFixed(2)}</p>
          <p>Total: ₹{cart.total().toFixed(2)}</p>
        </div>
        
        <button 
          onClick={cart.clearCart}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Cart
        </button>
      </div>
    </div>
  );
}
