'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Filter, ChevronDown, X } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { getAllProducts, normalizeProduct, getMetafield } from '@/lib/woocommerce';
import usePageLoading from '@/hooks/usePageLoading';
import { formatPrice, getCurrencySymbol } from '@/lib/productUtils';
import { Skeleton } from '@/components/ui/skeleton';
import FashionLoader from '@/components/ui/FashionLoader';

// Define product type
interface ProductImage {
  url: string;
}

interface ProductVariant {
  id: string;
  title?: string;
  price?: string;
  compareAtPrice?: string | null;
  currencyCode?: string;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  description?: string;
  descriptionHtml?: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: Array<{url: string, altText?: string}>;
  variants: any[];
  options: any[];
  collections: any[];
  availableForSale: boolean;
  metafields: Record<string, any>;
  currencyCode?: string;
  _originalWooProduct?: any;
}

// Filter options
const collections = [
  // Categories commented out as per request
  // { id: 'shirts', name: 'Shirts' },
  // { id: 'polos', name: 'Polos' },
  { id: 'all', name: 'All Categories' },
];

const sortOptions = [
  { id: 'newest', name: 'Newest' },
  { id: 'featured', name: 'Featured' },
  { id: 'price-asc', name: 'Price: Low to High' },
  { id: 'price-desc', name: 'Price: High to Low' },
  { id: 'rating', name: 'Alphabetical' }
];

export default function CollectionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Use the page loading hook
  usePageLoading(isLoading, 'fabric');
  
  // Fetch products from WooCommerce
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const allProducts = await getAllProducts(100); // Fetch up to 100 products
        
        if (!allProducts || allProducts.length === 0) {
          setError('We\'re experiencing technical difficulties. Please try again later.');
          setIsLoading(false);
          return;
        }
        
        // Normalize the products using the same function as homepage
        const transformedProducts = allProducts
          .map((product: any) => {
            const normalizedProduct = normalizeProduct(product);
            // Ensure currencyCode is included for use with currency symbols
            if (normalizedProduct) {
              normalizedProduct.currencyCode = 'INR'; // Default to INR or get from WooCommerce settings
            }
            return normalizedProduct;
          })
          .filter(Boolean);
        
        setProducts(transformedProducts);
        console.log(`Successfully fetched ${transformedProducts.length} products from WooCommerce`);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError('We\'re experiencing technical difficulties. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Determine product category based on collections or original product data
  const getCategoryFromProduct = (product: Product): string => {
    // Check collections first
    const collections = product.collections || [];
    const collectionSlugs = collections.map((col: any) => col.handle?.toLowerCase() || '');

    // Check original product data
    const originalProduct = product._originalWooProduct;
    const productType = originalProduct?.type?.toLowerCase() || '';
    const categories = originalProduct?.productCategories?.nodes || [];
    const categoryNames = categories.map((cat: any) => cat.name?.toLowerCase() || '');

    if (collectionSlugs.some(slug => slug.includes('shirt')) ||
        categoryNames.some(name => name.includes('shirt')) ||
        productType.includes('shirt')) {
      return 'shirts';
    } else if (collectionSlugs.some(slug => slug.includes('polo')) ||
               categoryNames.some(name => name.includes('polo')) ||
               productType.includes('polo')) {
      return 'polos';
    }

    return 'other';
  };
  
  // Filter products by category
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => getCategoryFromProduct(product) === selectedCategory);
  
  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (selectedSort) {
      case 'price-asc':
        const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
        const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
        return priceA - priceB;
      case 'price-desc':
        const priceDescA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
        const priceDescB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
        return priceDescB - priceDescA;
      case 'rating':
        // Sort by title as an alternative since rating is removed
        return a.title.localeCompare(b.title);
      case 'newest':
        // Sort by creation date if available, otherwise fall back to ID comparison
        const aDate = a._originalWooProduct?.dateCreated || a._originalWooProduct?.date_created || a.id;
        const bDate = b._originalWooProduct?.dateCreated || b._originalWooProduct?.date_created || b.id;
        
        // If we have actual dates, compare them
        if (aDate && bDate && aDate !== a.id && bDate !== b.id) {
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        }
        
        // Fallback to ID comparison (higher IDs are typically newer)
        return b.id.localeCompare(a.id);
      default:
        return 0;
    }
  });
  
  // Animation variants
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.3 } }
  };
  
  return (
    <div className="min-h-screen bg-[#f8f8f5] pt-8 pb-24">
      {/* Collection Header */}
      <div className="container mx-auto px-4 mb-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-serif font-bold mb-4 text-[#2c2c27]">
            The Collection
          </h1>
          <p className="text-[#5c5c52] mb-8">
            Discover our curated selection of timeless menswear essentials, crafted with exceptional 
            materials and meticulous attention to detail.
          </p>
        </div>
      </div>
      
      {/* Collection Banner */}
      <div className="relative h-[300px] mb-16 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80"
          alt="Ankkor Collection"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover image-animate"
        />
        <div className="absolute inset-0 bg-[#2c2c27] bg-opacity-30 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-3xl font-serif font-bold mb-4">Spring/Summer 2025</h2>
            <p className="text-lg max-w-xl mx-auto">Timeless elegance for the modern gentleman</p>
          </div>
        </div>
      </div>
      
      {/* Filters and Products */}
      <div className="container mx-auto px-4">
        {/* Error message */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-serif text-[#2c2c27] mb-4">Service Temporarily Unavailable</h3>
              <p className="text-[#5c5c52] mb-6">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-[#2c2c27] text-white px-6 py-2 hover:bg-[#3d3d35] transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {/* Mobile Filter Button */}
        <div className="flex justify-between items-center mb-8 md:hidden">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 text-[#2c2c27] border border-[#e5e2d9] px-4 py-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filter & Sort</span>
          </button>
          <div className="text-[#5c5c52] text-sm">
            {sortedProducts.length} products
          </div>
        </div>
        
        {/* Mobile Filter Drawer */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsFilterOpen(false)}></div>
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#f8f8f5] p-6 overflow-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif text-lg text-[#2c2c27]">Filter & Sort</h3>
                <button onClick={() => setIsFilterOpen(false)}>
                  <X className="h-5 w-5 text-[#2c2c27]" />
                </button>
              </div>
              
              {/* Categories section commented out as per request
              <div className="mb-8">
                <h4 className="text-[#8a8778] text-xs uppercase tracking-wider mb-4">Categories</h4>
                <div className="space-y-3">
                  {collections.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`block w-full text-left py-1 ${
                        selectedCategory === category.id
                          ? 'text-[#2c2c27] font-medium'
                          : 'text-[#5c5c52]'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              */}
              
              <div>
                <h4 className="text-[#8a8778] text-xs uppercase tracking-wider mb-4">Sort By</h4>
                <div className="space-y-3">
                  {sortOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedSort(option.id)}
                      className={`block w-full text-left py-1 ${
                        selectedSort === option.id
                          ? 'text-[#2c2c27] font-medium'
                          : 'text-[#5c5c52]'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full bg-[#2c2c27] text-[#f4f3f0] py-3 mt-8 text-sm uppercase tracking-wider"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-10">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24">
              {/* Categories section commented out as per request
              <div className="mb-10">
                <h3 className="text-[#2c2c27] font-serif text-lg mb-6">Categories</h3>
                <div className="space-y-3">
                  {collections.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`block w-full text-left py-1 ${
                        selectedCategory === category.id
                          ? 'text-[#2c2c27] font-medium'
                          : 'text-[#5c5c52] hover:text-[#2c2c27] transition-colors'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              */}
              
              <div>
                <h3 className="text-[#2c2c27] font-serif text-lg mb-6">Sort By</h3>
                <div className="space-y-3">
                  {sortOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedSort(option.id)}
                      className={`block w-full text-left py-1 ${
                        selectedSort === option.id
                          ? 'text-[#2c2c27] font-medium'
                          : 'text-[#5c5c52] hover:text-[#2c2c27] transition-colors'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Products Grid */}
          <div className="flex-1">
            <div className="hidden md:flex justify-between items-center mb-8">
              <h2 className="text-[#2c2c27] font-serif text-xl">
                {selectedCategory === 'all' ? 'All Products' : collections.find(c => c.id === selectedCategory)?.name}
              </h2>
              <div className="text-[#5c5c52]">
                {sortedProducts.length} products
              </div>
            </div>
            
            {/* Loading state */}
            {isLoading && (
              <div className="flex justify-center items-center py-20">
                <FashionLoader 
                  size="lg" 
                  variant="fabric" 
                  className="min-h-[200px]" 
                  text="Loading Products"
                />
              </div>
            )}

            {/* Products grid */}
            {!isLoading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedProducts.map(product => {
                // Extract and validate the variant ID for the product
                let variantId = '';
                
                try {
                  // Check if variants exist and extract the first variant ID
                  if (product.variants && product.variants.length > 0) {
                    const variant = product.variants[0];
                    
                    if (variant && variant.id) {
                      variantId = variant.id;
                      
                      // Ensure the variant ID is properly formatted for WooCommerce
                      if (!variantId.startsWith('gid://woocommerce/ProductVariant/')) {
                        // Extract numeric ID if possible and reformat
                        const numericId = variantId.replace(/\D/g, '');
                        if (numericId) {
                          variantId = `gid://woocommerce/ProductVariant/${numericId}`;
                        } else {
                          console.warn(`Cannot parse variant ID for product ${product.title}: ${variantId}`);
                          variantId = '';
                        }
                      }
                    }
                  }
                  
                  // If variant ID is still empty, try to create a fallback from product ID
                  if (!variantId && product.id) {
                    // Only attempt fallback if product ID has expected format
                    if (product.id.includes('/')) {
                      const parts = product.id.split('/');
                      const numericId = parts[parts.length - 1];
                      
                      if (numericId && /^\d+$/.test(numericId)) {
                        // Get the first variant ID by appending to the product ID
                        // This is based on how WooCommerce often constructs variant IDs
                        variantId = `gid://woocommerce/ProductVariant/${numericId}1`;
                        console.warn(`Using fallback variant ID for product ${product.title}: ${variantId}`);
                      }
                    }
                  }
                  
                  // Return the product card component with the product data
                  const originalProduct = product._originalWooProduct;
                  return (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.title}
                      slug={product.handle}
                      price={originalProduct?.salePrice || originalProduct?.price || product.priceRange?.minVariantPrice?.amount || '0'}
                      image={product.images[0]?.url || ''}
                      isNew={true}
                      stockStatus={originalProduct?.stockStatus || "IN_STOCK"}
                      stockQuantity={originalProduct?.stockQuantity}
                      compareAtPrice={product.compareAtPrice}
                      regularPrice={originalProduct?.regularPrice}
                      salePrice={originalProduct?.salePrice}
                      onSale={originalProduct?.onSale || false}
                      currencySymbol={getCurrencySymbol(product.currencyCode)}
                      currencyCode={product.currencyCode || 'INR'}
                      shortDescription={originalProduct?.shortDescription}
                      type={originalProduct?.type}
                    />
                  );
                } catch (error) {
                  console.error(`Error processing product ${product.title || 'unknown'}:`, error);
                  return null; // Skip rendering this product if there's an error
                }
              })}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && sortedProducts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#5c5c52]">No products available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

