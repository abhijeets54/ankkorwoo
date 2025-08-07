'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/ui/loader';
import Image from 'next/image';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchStore } from '@/store/searchStore';
import { formatPriceSafe } from '@/lib/productUtils';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchBar = ({ isOpen, onClose }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [showPredictive, setShowPredictive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use search store for state management
  const {
    allProducts,
    filteredProducts,
    isLoading,
    isInitialized,
    loadProducts,
    setQuery: setStoreQuery
  } = useSearchStore();

  // Debounce the search query to avoid excessive filtering operations
  const debouncedQuery = useDebounce(query, 150);

  // Load all products when search bar opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      loadProducts();
    }
  }, [isOpen, isInitialized, loadProducts]);

  // Focus input when search bar opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update store query when debounced query changes
  useEffect(() => {
    setStoreQuery(debouncedQuery);
    setShowPredictive(debouncedQuery.trim().length >= 2 && filteredProducts.length > 0);
  }, [debouncedQuery, setStoreQuery, filteredProducts.length]);

  // Handle click outside of predictive results to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current && 
        inputRef.current && 
        !resultsRef.current.contains(event.target as Node) && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPredictive(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setShowPredictive(false);

    // Navigate to search results page
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);

    // Reset state
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Handle escape key to close search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleProductClick = (slug: string) => {
    setShowPredictive(false);
    router.push(`/product/${slug}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[102] flex items-start justify-center bg-[#2c2c27]/90 pt-24 px-4">
      <div className="w-full max-w-2xl bg-[#f8f8f5] rounded-lg shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#e5e2d9]">
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for products..."
              className="w-full pl-10 pr-10 py-3 border-none bg-transparent text-[#2c2c27] placeholder-[#8a8778] focus:outline-none focus:ring-0"
            />
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8a8778]" />
            
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-[#8a8778] hover:text-[#2c2c27] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </form>
          
          {/* Predictive search results */}
          {showPredictive && (
            <div 
              ref={resultsRef}
              className="absolute z-10 mt-1 w-full max-w-2xl bg-[#f8f8f5] border border-[#e5e2d9] rounded-lg shadow-lg overflow-hidden"
            >
              <div className="max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product.slug)}
                    className="flex items-center p-3 hover:bg-[#f4f3f0] cursor-pointer transition-colors border-b border-[#e5e2d9] last:border-0"
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-[#f4f3f0] overflow-hidden rounded">
                      {product.image && (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-[#2c2c27] font-medium line-clamp-1">{product.name}</h4>
                      {product.categories.length > 0 && (
                        <p className="text-[#8a8778] text-xs mt-1">{product.categories[0]}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#8a8778] ml-2" />
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-[#e5e2d9] bg-[#f4f3f0]">
                <button
                  onClick={handleSearch}
                  className="w-full text-[#2c2c27] text-sm font-medium py-2 flex items-center justify-center"
                >
                  View all results
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 text-[#5c5c52] text-sm">
          {!isInitialized ? (
            <div className="flex items-center justify-center py-8">
              <Loader size="md" color="#8a8778" />
              <span className="ml-2 text-sm">Loading products...</span>
            </div>
          ) : isLoading && !showPredictive ? (
            <div className="flex items-center justify-center py-8">
              <Loader size="md" color="#8a8778" />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">Popular Searches:</p>
              <div className="flex flex-wrap gap-2">
                {['Shirt', 'T-Shirt', 'Polo', 'Jeans', 'Jacket', 'Dress'].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setQuery(term);
                      if (inputRef.current) {
                        inputRef.current.focus();
                      }
                    }}
                    className="px-3 py-1 bg-[#f4f3f0] rounded-full text-[#5c5c52] hover:bg-[#e5e2d9] transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#8a8778] mt-2">
                Start typing to see instant results from {allProducts.length} products
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar; 