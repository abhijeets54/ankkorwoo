'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Filter, ChevronDown, X } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import Link from 'next/link';
import ImageLoader from '@/components/ui/ImageLoader';
import usePageLoading from '@/hooks/usePageLoading';
import { getAllProducts, normalizeProductImages, getMetafield } from '@/lib/woocommerce';
import { formatPrice, getCurrencySymbol } from '@/lib/productUtils';

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
  selectedOptions?: Array<{name: string; value: string}>;
  quantityAvailable?: number;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  price: string;
  images: ProductImage[];
  variants: ProductVariant[];
  metafields: Record<string, string>;
  productType?: string;
  tags?: string[];
  vendor?: string;
  material?: string;
  compareAtPrice?: string | null;
  currencyCode?: string;
}

export default function ShirtsCollectionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 25000]);
  const [sortOption, setSortOption] = useState('featured');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use the page loading hook
  usePageLoading(isLoading, 'fabric');
  
  // Fetch products from WooCommerce
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const allProducts = await getAllProducts();
        
        if (!allProducts || allProducts.length === 0) {
          setError('No products found. Please check your WooCommerce configuration.');
          setIsLoading(false);
          return;
        }
        
        // Transform products to match our interface and filter for shirts only
        const transformedProducts = allProducts
          .map((product: any) => {
            // Use the utility function to safely extract images
            const productImages = normalizeProductImages(product.images, product.title);
            
            // Extract material from metafields
            let material = '';
            try {
              // Add null check and proper error handling
              if (product && product.metafields) {
                const customMaterial = product.metafields.find(
                  (metafield: any) => metafield && metafield.key === 'custom_material'
                );
                material = customMaterial?.value || '';
              }
            } catch (error) {
              console.error(`Error extracting material for product ${product?.title}:`, error);
              material = '';
            }
            
            // Extract variants from the product data
            let variants: ProductVariant[] = [];
            try {
              // Handle GraphQL edges/node format
              if (product.variants?.edges) {
                variants = product.variants.edges.map((edge: any) => ({
                  id: edge.node.id,
                  title: edge.node.title,
                  price: edge.node.price?.amount,
                  compareAtPrice: edge.node.compareAtPrice?.amount,
                }));
              } 
              // Handle already normalized array format
              else if (Array.isArray(product.variants)) {
                variants = product.variants;
              }
              
              // Ensure we have at least one variant if needed
              if (variants.length === 0 && product.id) {
                // Create a fallback variant using the product ID
                const productIdParts = product.id.split('/');
                const productIdNum = productIdParts[productIdParts.length - 1];
                variants = [{
                  id: `gid://shopify/ProductVariant/${productIdNum}`,
                  title: 'Default',
                  price: product.priceRange?.minVariantPrice?.amount || '0',
                }];
                console.warn(`Created fallback variant for product ${product.title}`);
              }
            } catch (error) {
              console.error(`Error extracting variants for product ${product?.title}:`, error);
              variants = [];
            }
            
            return {
              id: product.id,
              title: product.title || "Untitled Product",
              handle: product.handle || "",
              price: product.priceRange?.minVariantPrice?.amount || 
                     (variants[0]?.price) || 
                     "0.00",
              images: productImages,
              variants: variants,
              metafields: product.metafields || {},
              productType: product.productType || '',
              tags: Array.isArray(product.tags) ? product.tags : [],
              vendor: product.vendor || '',
              material: material,
              compareAtPrice: variants[0]?.compareAtPrice || null,
              currencyCode: product.priceRange?.minVariantPrice?.currencyCode || 
                          (variants[0]?.currencyCode) ||
                          'INR'
            };
          })
          .filter((product: Product) => {
            const productType = product.productType?.toLowerCase() || '';
            const tags = product.tags?.map(tag => tag.toLowerCase()) || [];
            const title = product.title.toLowerCase();
            
            // Filter for shirts
            return productType.includes('shirt') || 
                   tags.some(tag => tag.includes('shirt')) ||
                   title.includes('shirt');
          });
        
        setProducts(transformedProducts);
        console.log(`Successfully fetched ${transformedProducts.length} shirt products from WooCommerce`);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError('Failed to load products from WooCommerce');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Toggle filter drawer
  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };
  
  // Filter products by price range
  const filteredProducts = products.filter(product => {
    // Filter by price range
    const price = parseFloat(product.price) || 0;
    return price >= priceRange[0] && price <= priceRange[1];
  });
  
  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case 'price-asc':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'price-desc':
        return parseFloat(b.price) - parseFloat(a.price);
      case 'rating':
        // Sort by title as an alternative since rating is removed
        return a.title.localeCompare(b.title);
      case 'newest':
        // Sort by ID as a proxy for newness (higher IDs are typically newer)
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
            Shirts Collection
          </h1>
          <p className="text-[#5c5c52] mb-8">
            Discover our meticulously crafted shirts, designed with premium fabrics and impeccable attention to detail.
          </p>
        </div>
      </div>
      
      {/* Collection Banner */}
      <div className="relative h-[300px] mb-16 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80"
          alt="Ankkor Shirts Collection"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover image-animate"
        />
        <div className="absolute inset-0 bg-[#2c2c27] bg-opacity-30 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-3xl font-serif font-bold mb-4">Signature Shirts</h2>
            <p className="text-lg max-w-xl mx-auto">Impeccably tailored for the perfect fit</p>
          </div>
        </div>
      </div>
      
      {/* Filters and Products */}
      <div className="container mx-auto px-4">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-8 rounded">
            <p>{error}</p>
            <p className="text-sm mt-2">Please check your WooCommerce configuration in the .env.local file.</p>
          </div>
        )}
        
        {/* Mobile Filter Button */}
        <div className="flex justify-between items-center mb-8 md:hidden">
          <button
            onClick={toggleFilter}
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
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleFilter}></div>
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#f8f8f5] p-6 overflow-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif text-lg text-[#2c2c27]">Filter & Sort</h3>
                <button onClick={toggleFilter}>
                  <X className="h-5 w-5 text-[#2c2c27]" />
                </button>
              </div>
              

              <div className="mb-8">
                <h4 className="text-[#8a8778] text-xs uppercase tracking-wider mb-4">Price Range</h4>
                <div className="px-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-[#5c5c52] text-sm">{getCurrencySymbol('INR')}{priceRange[0]}</span>
                    <span className="text-[#5c5c52] text-sm">{getCurrencySymbol('INR')}{priceRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-[#e5e2d9] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-[#8a8778] text-xs uppercase tracking-wider mb-4">Sort By</h4>
                <div className="space-y-3">
                  {[
                    { id: 'featured', name: 'Featured' },
                    { id: 'price-asc', name: 'Price: Low to High' },
                    { id: 'price-desc', name: 'Price: High to Low' },
                    { id: 'rating', name: 'Alphabetical' },
                    { id: 'newest', name: 'Newest' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSortOption(option.id)}
                      className={`block w-full text-left py-1 ${
                        sortOption === option.id
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
                onClick={toggleFilter}
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
<div className="mb-10">
                <h3 className="text-[#2c2c27] font-serif text-lg mb-6">Price Range</h3>
                <div className="px-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-[#5c5c52]">{getCurrencySymbol('INR')}{priceRange[0]}</span>
                    <span className="text-[#5c5c52]">{getCurrencySymbol('INR')}{priceRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-[#e5e2d9] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-[#2c2c27] font-serif text-lg mb-6">Sort By</h3>
                <div className="space-y-3">
                  {[
                    { id: 'featured', name: 'Featured' },
                    { id: 'price-asc', name: 'Price: Low to High' },
                    { id: 'price-desc', name: 'Price: High to Low' },
                    { id: 'rating', name: 'Alphabetical' },
                    { id: 'newest', name: 'Newest' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSortOption(option.id)}
                      className={`block w-full text-left py-1 ${
                        sortOption === option.id
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
                Shirts Collection
              </h2>
              <div className="text-[#5c5c52]">
                {sortedProducts.length} products
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedProducts.map(product => {
                // Extract and validate the variant ID for the product
                let variantId = '';
                let isValidVariant = false;
                
                try {
                  // Check if variants exist and extract the first variant ID
                  if (product.variants && product.variants.length > 0) {
                    const variant = product.variants[0];
                    if (variant && variant.id) {
                      variantId = variant.id;
                      isValidVariant = true;
                      
                      // Ensure the variant ID is properly formatted
                      if (!variantId.startsWith('gid://shopify/ProductVariant/')) {
                        // Extract numeric ID if possible and reformat
                        const numericId = variantId.replace(/\D/g, '');
                        if (numericId) {
                          variantId = `gid://shopify/ProductVariant/${numericId}`;
                        } else {
                          console.warn(`Cannot parse variant ID for product ${product.title}: ${variantId}`);
                          isValidVariant = false;
                        }
                      }
                      
                      console.log(`Product ${product.title} using variant ID: ${variantId}`);
                    }
                  }
                  
                  // If no valid variant ID found, try to create a fallback from product ID
                  if (!isValidVariant && product.id) {
                    // Only attempt fallback if product ID has a numeric component
                    if (product.id.includes('/')) {
                      const parts = product.id.split('/');
                      const numericId = parts[parts.length - 1];
                      
                      if (numericId && /^\d+$/.test(numericId)) {
                        // Create a fallback ID - note this might not work if variants aren't 1:1 with products
                        variantId = `gid://shopify/ProductVariant/${numericId}`;
                        console.warn(`Using fallback variant ID for ${product.title}: ${variantId}`);
                        isValidVariant = true;
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error processing variant for product ${product.title}:`, error);
                  isValidVariant = false;
                }
                
                // If we couldn't find a valid variant ID, log an error
                if (!isValidVariant) {
                  console.error(`No valid variant ID found for product: ${product.title}`);
                }
                
                return (
                  <motion.div
                    key={product.id}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    layout
                  >
                    <ProductCard
                      id={product.id}
                      name={product.title}
                      price={product._originalWooProduct?.salePrice || product._originalWooProduct?.price || product.price}
                      image={product.images[0]?.url || ''}
                      slug={product.handle}
                      material={getMetafield(product, 'custom_material', undefined, product.vendor || 'Premium Fabric')}
                      isNew={true}
                      stockStatus={product._originalWooProduct?.stockStatus || "IN_STOCK"}
                      currencySymbol={getCurrencySymbol(product.currencyCode)}
                      currencyCode={product.currencyCode || 'INR'}
                      compareAtPrice={product.compareAtPrice}
                      regularPrice={product._originalWooProduct?.regularPrice}
                      salePrice={product._originalWooProduct?.salePrice}
                      onSale={product._originalWooProduct?.onSale || false}
                      shortDescription={product._originalWooProduct?.shortDescription}
                      type={product._originalWooProduct?.type}
                    />
                  </motion.div>
                );
              })}
            </div>
            
            {sortedProducts.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <p className="text-[#5c5c52] mb-4">No products found with the selected filters.</p>
                <button
                  onClick={() => {
                    setSelectedMaterials([]);
                    setPriceRange([0, 25000]);
                  }}
                  className="text-[#2c2c27] underline"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 

