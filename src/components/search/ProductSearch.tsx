'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchProducts } from '@/lib/woocommerce';
import Image from 'next/image';
import Link from 'next/link';
import { useDebounce } from '@/hooks/useDebounce';

interface ProductSearchProps {
  className?: string;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: string;
  image?: {
    sourceUrl: string;
    altText: string;
  };
}

const ProductSearch: React.FC<ProductSearchProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const debouncedQuery = useDebounce(query, 300);
  
  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Focus input when search is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Search products when query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      
      setIsLoading(true);
      
      try {
        const data = await searchProducts(debouncedQuery);
        setResults(data.nodes || []);
      } catch (error) {
        console.error('Error searching products:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [debouncedQuery]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setQuery('');
    }
  };
  
  const toggleSearch = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  };
  
  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <button
        onClick={toggleSearch}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Search products"
      >
        <Search className="h-5 w-5" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-screen max-w-md bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          >
            <div className="p-4">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2c2c27]"
                  aria-label="Search products"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Submit search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
              
              <div className="mt-4 max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="py-4 text-center">
                    <div className="inline-block h-6 w-6 border-2 border-t-[#2c2c27] border-gray-200 rounded-full animate-spin"></div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((product) => (
                      <Link
                        href={`/product/${product.slug}`}
                        key={product.id}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center p-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        {product.image && (
                          <div className="w-12 h-12 relative bg-gray-100 mr-3 flex-shrink-0">
                            <Image
                              src={product.image.sourceUrl}
                              alt={product.image.altText || product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        </div>
                      </Link>
                    ))}
                    
                    {query.trim().length >= 2 && (
                      <div className="pt-2 border-t border-gray-200">
                        <button
                          onClick={handleSubmit}
                          className="text-sm text-[#2c2c27] hover:underline"
                        >
                          See all results for "{query}"
                        </button>
                      </div>
                    )}
                  </div>
                ) : query.trim().length >= 2 ? (
                  <p className="py-4 text-center text-gray-500">No products found</p>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductSearch; 