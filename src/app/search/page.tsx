'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/product/ProductCard';
import { Loader2 } from 'lucide-react';
import { useSearchStore } from '@/store/searchStore';
import { formatPriceSafe } from '@/lib/productUtils';

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

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  // Use search store for consistent state management
  const {
    allProducts,
    filteredProducts,
    isLoading,
    isInitialized,
    loadProducts,
    setQuery: setStoreQuery
  } = useSearchStore();

  const [error, setError] = useState<string | null>(null);

  // Load products when component mounts
  useEffect(() => {
    if (!isInitialized) {
      loadProducts().catch(err => {
        console.error('Error loading products:', err);
        setError('Failed to load products. Please try again.');
      });
    }
  }, [isInitialized, loadProducts]);

  // Update store query when URL query changes
  useEffect(() => {
    setStoreQuery(query);
  }, [query, setStoreQuery]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif mb-2">Search Results</h1>
      {query && (
        <p className="text-gray-600 mb-4">
          Showing results for "{query}"
        </p>
      )}

      {/* Show search stats */}
      {!isLoading && !error && (
        <p className="text-sm text-gray-500 mb-8">
          {query ? `Found ${filteredProducts.length} products` : `Browse all ${allProducts.length} products`}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading products...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      ) : query && filteredProducts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-xl text-gray-500 mb-4">No products found for "{query}"</p>
          <p className="text-gray-500 mb-6">
            Try using different keywords or check for spelling errors
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Shirt', 'T-Shirt', 'Polo', 'Jeans', 'Jacket', 'Dress'].map((term) => (
                <button
                  key={term}
                  onClick={() => window.location.href = `/search?q=${encodeURIComponent(term)}`}
                  className="px-3 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors text-sm"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {(query ? filteredProducts : allProducts.slice(0, 24)).map((product) => {
            // Clean price data for ProductCard
            const cleanPrice = product.price && !isNaN(parseFloat(product.price)) ? product.price : '0.00';

            return (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={cleanPrice}
                image={product.image || ''}
                slug={product.slug}
                stockStatus="instock"
                regularPrice={cleanPrice}
                salePrice=""
                onSale={false}
                shortDescription={product.shortDescription}
                type="simple"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main page component with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-12 px-4"><div className="text-center">Loading...</div></div>}>
      <SearchContent />
    </Suspense>
  );
}