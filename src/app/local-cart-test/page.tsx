'use client';

import React, { useState, useEffect } from 'react';
import { useLocalCartStore } from '@/lib/localCartStore';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import * as woocommerce from '@/lib/woocommerce';

export default function LocalCartTestPage() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const {
    items,
    itemCount,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    subtotal,
    total
  } = useLocalCartStore();
  
  // Load some test products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await woocommerce.getProducts();
        setProducts(data.nodes || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading products:', error);
        setError(error instanceof Error ? error.message : 'Failed to load products');
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);
  
  // Add a product to the cart
  const handleAddToCart = (product: any) => {
    addToCart({
      productId: product.databaseId.toString(),
      name: product.name,
      price: product.price || '0',
      quantity: 1,
      image: {
        url: product.image?.sourceUrl || '',
        altText: product.image?.altText || product.name
      }
    });
  };
  
  // Update the quantity of an item
  const handleUpdateQuantity = (id: string, quantity: number) => {
    updateCartItem(id, quantity);
  };
  
  // Remove an item from the cart
  const handleRemoveItem = (id: string) => {
    removeCartItem(id);
  };
  
  // Clear the cart
  const handleClearCart = () => {
    clearCart();
  };
  
  // Navigate to checkout
  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      // Create a new cart in WooCommerce
      await woocommerce.createCart();
      
      // Add each item to the WooCommerce cart
      for (const item of items) {
        await woocommerce.addToCart('', [{
          productId: parseInt(item.productId),
          variationId: item.variationId ? parseInt(item.variationId) : undefined,
          quantity: item.quantity
        }]);
      }
      
      // Navigate to the checkout page
      window.location.href = '/checkout';
      
    } catch (error) {
      console.error('Error during checkout:', error);
      setError(error instanceof Error ? error.message : 'Failed to proceed to checkout');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Local Cart Test</h1>
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Products Section */}
        <div className="border rounded-md p-4">
          <h2 className="text-lg font-medium mb-4">Products</h2>
          
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
          
          {!loading && products.length === 0 && (
            <p className="text-gray-500">No products available</p>
          )}
          
          <ul className="space-y-4">
            {products.slice(0, 5).map(product => (
              <li key={product.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-500">₹{product.price || '0'}</p>
                </div>
                <Button
                  onClick={() => handleAddToCart(product)}
                  size="sm"
                >
                  Add to Cart
                </Button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Cart Section */}
        <div className="border rounded-md p-4">
          <h2 className="text-lg font-medium mb-4">Cart ({itemCount} items)</h2>
          
          {items.length === 0 ? (
            <p className="text-gray-500">Your cart is empty</p>
          ) : (
            <>
              <ul className="space-y-4 mb-4">
                {items.map(item => (
                  <li key={item.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">₹{parseFloat(item.price).toFixed(2)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>${total().toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Proceed to Checkout
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 