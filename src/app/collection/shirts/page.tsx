'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

import ProductCard from '@/components/product/ProductCard';
import Link from 'next/link';
import ImageLoader from '@/components/ui/ImageLoader';
import { Skeleton } from '@/components/ui/skeleton';
import usePageLoading from '@/hooks/usePageLoading';
import { getCategoryProducts, normalizeProduct, getMetafield } from '@/lib/woocommerce';
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
  compareAtPrice?: string | null;
  _originalWooProduct?: any;
}

export default function ShirtsCollectionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Use the page loading hook
  usePageLoading(isLoading, 'fabric');
  
  // Fetch products from WooCommerce
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 Starting to fetch shirts from WooCommerce...');

        // First, let's test the WooCommerce connection
        let connectionTest = null;
        try {
          console.log('🧪 Testing WooCommerce connection...');
          const { testWooCommerceConnection } = await import('@/lib/woocommerce');
          connectionTest = await testWooCommerceConnection();
          console.log('🔗 Connection test result:', connectionTest);
        } catch (err) {
          console.log('❌ Failed to test connection:', err);
        }

        // Then, let's test if we can fetch all categories to see what's available
        let allCategories = null;
        try {
          console.log('📋 Fetching all categories to debug...');
          const { getAllCategories } = await import('@/lib/woocommerce');
          allCategories = await getAllCategories(50);
          console.log('📂 Available categories:', allCategories?.map((cat: any) => ({
            name: cat.name,
            slug: cat.slug,
            id: cat.id,
            count: cat.count
          })));
        } catch (err) {
          console.log('❌ Failed to fetch categories:', err);
        }

        // Try multiple approaches to fetch shirts
        let categoryData = null;
        let fetchMethod = '';

        // Method 1: Try with category slug 'shirts'
        try {
          console.log('📋 Attempting to fetch with category slug: "shirts"');
          categoryData = await getCategoryProducts('shirts', { first: 100 });
          fetchMethod = 'slug: shirts';

          if (categoryData?.products?.nodes?.length > 0) {
            console.log('✅ Success with method 1 (slug: shirts)');
          } else {
            console.log('⚠️ Method 1 returned empty or null:', categoryData);
          }
        } catch (err) {
          console.log('❌ Method 1 failed:', err);
        }

        // Method 2: Try with different category variations if method 1 failed
        if (!categoryData?.products?.nodes?.length) {
          const alternativeNames = ['shirt', 'Shirts', 'SHIRTS', 'men-shirts', 'mens-shirts', 'clothing', 'apparel'];

          for (const altName of alternativeNames) {
            try {
              console.log(`📋 Attempting to fetch with category: "${altName}"`);
              categoryData = await getCategoryProducts(altName, { first: 100 });
              fetchMethod = `slug: ${altName}`;

              if (categoryData?.products?.nodes?.length > 0) {
                console.log(`✅ Success with alternative name: ${altName}`);
                break;
              } else {
                console.log(`⚠️ No products found for category: ${altName}`);
              }
            } catch (err) {
              console.log(`❌ Failed with ${altName}:`, err);
            }
          }
        }

        // Method 3: Try to find the correct category from the list of all categories
        if (!categoryData?.products?.nodes?.length && allCategories?.length > 0) {
          console.log('📋 Searching for shirt-related categories in available categories...');
          const shirtCategory = allCategories.find((cat: any) => {
            const name = cat.name?.toLowerCase() || '';
            const slug = cat.slug?.toLowerCase() || '';
            return name.includes('shirt') || slug.includes('shirt') ||
                   name.includes('clothing') || slug.includes('clothing') ||
                   name.includes('apparel') || slug.includes('apparel');
          });

          if (shirtCategory) {
            console.log(`📋 Found potential shirt category: ${shirtCategory.name} (${shirtCategory.slug})`);
            try {
              categoryData = await getCategoryProducts(shirtCategory.slug, { first: 100 });
              fetchMethod = `found category: ${shirtCategory.slug}`;

              if (categoryData?.products?.nodes?.length > 0) {
                console.log(`✅ Success with found category: ${shirtCategory.slug}`);
              }
            } catch (err) {
              console.log(`❌ Failed with found category ${shirtCategory.slug}:`, err);
            }
          }
        }

        // Method 4: If still no results, try fetching all products and filter by keywords
        if (!categoryData?.products?.nodes?.length) {
          try {
            console.log('📋 Attempting to fetch all products and filter by keywords...');
            const { getAllProducts } = await import('@/lib/woocommerce');
            const allProducts = await getAllProducts(100);
            fetchMethod = 'all products filtered by keywords';

            if (allProducts?.length > 0) {
              // Filter products that might be shirts
              const filteredProducts = allProducts.filter((product: any) => {
                const title = product.name?.toLowerCase() || product.title?.toLowerCase() || '';
                const description = product.description?.toLowerCase() || product.shortDescription?.toLowerCase() || '';
                const categories = product.productCategories?.nodes || product.categories || [];

                // Check if product title or description contains shirt-related keywords
                const shirtKeywords = ['shirt', 'formal', 'casual', 'dress', 'button', 'collar', 'sleeve'];
                const hasShirtKeyword = shirtKeywords.some(keyword =>
                  title.includes(keyword) || description.includes(keyword)
                );

                // Check if product belongs to shirts category
                const hasShirtCategory = categories.some((cat: any) => {
                  const catName = cat.name?.toLowerCase() || cat.slug?.toLowerCase() || '';
                  return catName.includes('shirt') || catName.includes('clothing') || catName.includes('apparel');
                });

                return hasShirtKeyword || hasShirtCategory;
              });

              // Create a mock category structure
              categoryData = {
                products: {
                  nodes: filteredProducts
                }
              };
              console.log(`✅ Filtered ${filteredProducts.length} shirt products from all products`);
            }
          } catch (err) {
            console.log('❌ Method 4 failed:', err);
          }
        }

        // Set debug information
        setDebugInfo({
          fetchMethod,
          totalProducts: categoryData?.products?.nodes?.length || 0,
          connectionTest: connectionTest || 'No connection test performed',
          availableCategories: allCategories?.map((cat: any) => ({ name: cat.name, slug: cat.slug, count: cat.count })) || [],
          categoryData: categoryData ? JSON.stringify(categoryData, null, 2) : 'No data',
          timestamp: new Date().toISOString()
        });

        console.log('📊 Debug Info:', {
          fetchMethod,
          totalProducts: categoryData?.products?.nodes?.length || 0,
          hasData: !!categoryData,
          hasProducts: !!categoryData?.products,
          hasNodes: !!categoryData?.products?.nodes,
          availableCategories: allCategories?.length || 0
        });

        if (!categoryData || !categoryData.products?.nodes || categoryData.products.nodes.length === 0) {
          console.log('❌ No shirt products found in any category');
          setError('We\'re experiencing technical difficulties. Please try again later.');
          setIsLoading(false);
          return;
        }

        const allProducts = categoryData.products.nodes;
        console.log(`📦 Found ${allProducts.length} products, normalizing...`);

        // Normalize the products
        const transformedProducts = allProducts
          .map((product: any, index: number) => {
            try {
              console.log(`🔄 Normalizing product ${index + 1}:`, product.name || product.title);
              const normalizedProduct = normalizeProduct(product);

              if (normalizedProduct) {
                // Ensure currencyCode is included
                (normalizedProduct as any).currencyCode = 'INR';
                console.log(`✅ Successfully normalized: ${normalizedProduct.title}`);
                return normalizedProduct;
              } else {
                console.log(`⚠️ Failed to normalize product: ${product.name || product.title}`);
                return null;
              }
            } catch (err) {
              console.error(`❌ Error normalizing product ${index + 1}:`, err);
              return null;
            }
          })
          .filter(Boolean) as Product[];

        console.log(`🎉 Successfully processed ${transformedProducts.length} shirt products`);
        console.log('📦 Setting products:', transformedProducts.map(p => ({
          title: p.title,
          price: p.priceRange?.minVariantPrice?.amount,
          id: p.id
        })));
        setProducts(transformedProducts);

      } catch (err) {
        console.error("💥 Critical error fetching products:", err);
        setError('We\'re experiencing technical difficulties. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);
  

  
  // Sort products with newest first
  const sortedProducts = [...products].sort((a, b) => {
    // Sort by creation date if available, otherwise fall back to ID comparison
    const aDate = a._originalWooProduct?.dateCreated || a._originalWooProduct?.date_created || a.id;
    const bDate = b._originalWooProduct?.dateCreated || b._originalWooProduct?.date_created || b.id;
    
    // If we have actual dates, compare them
    if (aDate && bDate && aDate !== a.id && bDate !== b.id) {
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }
    
    // Fallback to ID comparison (higher IDs are typically newer)
    return b.id.localeCompare(a.id);
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

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <Skeleton className="w-full h-80 mb-4" />
                <Skeleton className="w-3/4 h-4 mb-2" />
                <Skeleton className="w-1/2 h-4" />
              </div>
            ))}
          </div>
        )}
        
        {/* Product Count */}
        <div className="flex justify-end items-center mb-8">
          <div className="text-[#5c5c52] text-sm">
            {sortedProducts.length} products
          </div>
        </div>

        
        {/* Products Grid */}
        <div>
            <div className="hidden md:flex justify-between items-center mb-8">
              <h2 className="text-[#2c2c27] font-serif text-xl">
                Shirts Collection
              </h2>
              <div className="text-[#5c5c52]">
                {sortedProducts.length} products
              </div>
            </div>
            
            {!isLoading && !error && sortedProducts.length > 0 && (
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
                        slug={product.handle}
                        price={product._originalWooProduct?.salePrice || product._originalWooProduct?.price || product.priceRange?.minVariantPrice?.amount || '0'}
                        image={product.images[0]?.url || ''}
                        material={getMetafield(product, 'custom_material', undefined, 'Premium Fabric')}
                        isNew={true}
                        stockStatus={product._originalWooProduct?.stockStatus || "IN_STOCK"}
                        compareAtPrice={product.compareAtPrice}
                        regularPrice={product._originalWooProduct?.regularPrice}
                        salePrice={product._originalWooProduct?.salePrice}
                        onSale={product._originalWooProduct?.onSale || false}
                        currencySymbol={getCurrencySymbol(product.currencyCode)}
                        currencyCode={product.currencyCode || 'INR'}
                        shortDescription={product._originalWooProduct?.shortDescription}
                        type={product._originalWooProduct?.type}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
            
            {!isLoading && !error && sortedProducts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#5c5c52]">No shirts available at the moment.</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}