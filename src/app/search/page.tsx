'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchProducts } from '@/lib/woocommerce';
import ProductCard from '@/components/product/ProductCard';
import { Loader2 } from 'lucide-react';

interface WooProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  regularPrice?: string;
  salePrice?: string;
  onSale?: boolean;
  shortDescription?: string;
  type?: string;
  image?: {
    sourceUrl: string;
    altText: string;
  };
  stockStatus: string;
  databaseId: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchSearchResults() {
      if (!query) {
        setProducts([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await searchProducts(query, 24);
        setProducts(data.nodes || []);
      } catch (err) {
        console.error('Error fetching search results:', err);
        setError('Failed to load search results. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSearchResults();
  }, [query]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif mb-2">Search Results</h1>
      {query && (
        <p className="text-gray-600 mb-8">
          Showing results for "{query}"
        </p>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-xl text-gray-500 mb-4">No products found</p>
          <p className="text-gray-500">
            Try using different keywords or check for spelling errors
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.salePrice || product.price}
              image={product.image?.sourceUrl || ''}
              slug={product.slug}
              stockStatus={product.stockStatus}
              regularPrice={product.regularPrice}
              salePrice={product.salePrice}
              onSale={product.onSale || false}
              shortDescription={product.shortDescription}
              type={product.type}
            />
          ))}
        </div>
      )}
    </div>
  );
} 