'use client';

import React, { useEffect, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { useLocalCartStore } from '@/lib/localCartStore';
import * as woocommerce from '@/lib/woocommerce';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: string;
  image: {
    sourceUrl: string;
    altText: string;
  };
  slug: string;
  stockStatus: string;
}

const WooCommerceTest: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cart = useLocalCartStore();
  const { openCart } = useCart();
  
  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await woocommerce.getAllProducts(10);
        if (data?.products?.nodes) {
          setProducts(data.products.nodes.map((product: any) => ({
            id: product.databaseId.toString(),
            name: product.name,
            price: product.price,
            image: {
              sourceUrl: product.image?.sourceUrl || '/placeholder-product.jpg',
              altText: product.image?.altText || product.name
            },
            slug: product.slug,
            stockStatus: product.stockStatus
          })));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Add product to cart
  const handleAddToCart = async (product: Product) => {
    try {
      await cart.addToCart({
        productId: product.id,
        quantity: 1,
        name: product.name,
        price: product.price,
        image: {
          url: product.image.sourceUrl,
          altText: product.image.altText
        }
      });
      
      // Open cart after adding product
      openCart();
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError('Failed to add product to cart');
    }
  };
  
  if (loading) {
    return <div className="p-8 text-center">Loading products...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-serif mb-8">WooCommerce Integration Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border border-gray-200 rounded p-4">
            <div className="relative h-48 mb-4">
              <Image
                src={product.image.sourceUrl}
                alt={product.image.altText}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                className="rounded"
              />
            </div>
            <h2 className="text-lg font-serif mb-2">{product.name}</h2>
            <p className="mb-4">Price: ${parseFloat(product.price).toFixed(2)}</p>
            <p className="mb-4 text-sm">
              Stock Status: 
              <span className={product.stockStatus === 'IN_STOCK' ? 'text-green-600' : 'text-red-600'}>
                {product.stockStatus === 'IN_STOCK' ? ' In Stock' : ' Out of Stock'}
              </span>
            </p>
            <button
              onClick={() => handleAddToCart(product)}
              disabled={product.stockStatus !== 'IN_STOCK'}
              className="w-full py-2 bg-[#2c2c27] text-white rounded hover:bg-[#3c3c37] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 border border-gray-200 rounded">
        <h2 className="text-xl font-serif mb-4">Cart Summary</h2>
        <p>Items in cart: {cart.itemCount}</p>
        <p>Subtotal: ${parseFloat(cart.subtotal || '0').toFixed(2)}</p>
        <button
          onClick={openCart}
          className="mt-4 px-6 py-2 bg-[#2c2c27] text-white rounded hover:bg-[#3c3c37] transition-colors"
        >
          View Cart
        </button>
      </div>
    </div>
  );
};

export default WooCommerceTest; 