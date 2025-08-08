import React, { useState } from 'react';
import Link from 'next/link';
import { useWooProducts } from '@/hooks/useWooProducts';
import ProductCard from './ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';

interface ProductGridProps {
  title?: string;
  initialProducts?: any[];
  perPage?: number;
  showPagination?: boolean;
  className?: string;
  category?: string;
}

/**
 * A grid display of products with pagination support using SWR
 * Updated to work with WooCommerce data structure
 */
export default function ProductGrid({
  title,
  initialProducts,
  perPage = 8,
  showPagination = true,
  className = '',
  category = ''
}: ProductGridProps) {
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<any[]>(initialProducts || []);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Use the new WooCommerce hook for data fetching with pagination
  const { data, error, isLoading, mutate } = useWooProducts({
    first: perPage,
    after: endCursor,
    category: category,
  }, {
    // If we have initial products, don't fetch on mount
    fallbackData: initialProducts ? { products: { nodes: initialProducts } } : undefined
  });

  // Extract the products and pagination info from the data
  const products = data?.products?.nodes || [];
  const pageInfo = data?.products?.pageInfo;
  const hasNextPage = pageInfo?.hasNextPage;

  // Add new products to the existing list when loading more
  React.useEffect(() => {
    if (data && endCursor) {
      setAllProducts(prev => [...prev, ...products]);
      setIsLoadingMore(false);
    }
  }, [data, endCursor, products]);

  // Handle loading more products
  const handleLoadMore = () => {
    if (hasNextPage && pageInfo?.endCursor) {
      setIsLoadingMore(true);
      setEndCursor(pageInfo.endCursor);
    }
  };

  // Display products from state if we have loaded more, otherwise use the current response
  const displayProducts = endCursor ? allProducts : products;

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h2 className="text-2xl md:text-3xl font-serif mb-8 text-[#2c2c27]">{title}</h2>
      )}
      
      {/* Error state */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-red-600">Error loading products. Please try again later.</p>
          <Button 
            onClick={() => mutate()} 
            className="mt-4 bg-[#2c2c27] text-[#f4f3f0] hover:bg-[#3d3d35]"
          >
            Retry
          </Button>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && !initialProducts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: perPage }).map((_, i) => (
            <div 
              key={`skeleton-${i}`} 
              className="bg-[#f4f3f0] animate-pulse rounded h-[450px]"
            />
          ))}
        </div>
      )}
      
      {/* Products grid */}
      {displayProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map((product: any) => (
            <ProductCard
              key={product.databaseId || product.id}
              id={product.databaseId?.toString() || product.id}
              name={product.name}
              price={product.salePrice || product.price || '0.00'}
              image={product.image?.sourceUrl || '/placeholder-product.jpg'}
              slug={product.slug}
              material={product.attributes?.nodes?.find((attr: any) => attr.name === 'Material')?.options?.[0] || ''}
              isNew={product.isNew || false}
              stockStatus={product.stockStatus}
              stockQuantity={product.stockQuantity}
              compareAtPrice={product.regularPrice !== product.price ? product.regularPrice : null}
              regularPrice={product.regularPrice}
              salePrice={product.salePrice}
              onSale={product.onSale || false}
              shortDescription={product.shortDescription}
              type={product.type}
            />
          ))}
        </div>
      )}
      
      {/* No products */}
      {!isLoading && displayProducts.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-[#5c5c52]">No products found.</p>
        </div>
      )}
      
      {/* Pagination */}
      {showPagination && hasNextPage && (
        <div className="flex justify-center mt-12">
          <Button
            onClick={handleLoadMore}
            className="bg-transparent hover:bg-[#f4f3f0] border border-[#5c5c52] text-[#2c2c27] px-8 py-6 flex items-center space-x-2"
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Loading more...</span>
              </>
            ) : (
              <>
                <span>Load more products</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* View all link */}
      {title && (
        <div className="flex justify-center mt-8">
          <Link
            href="/collection"
            className="text-[#2c2c27] hover:text-[#8a8778] text-sm uppercase tracking-wider flex items-center transition-colors"
          >
            View all collections
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      )}
    </div>
  );
} 