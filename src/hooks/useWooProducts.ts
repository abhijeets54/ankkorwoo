import { useState, useEffect } from 'react';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import * as woocommerce from '@/lib/woocommerce';
import { getProducts, getProductBySlug, getCategories, searchProducts, getCategoryProducts } from '@/lib/woocommerce';

interface UseWooProductsOptions {
  first?: number;
  after?: string | null;
  category?: string;
  search?: string;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

interface UseWooProductsResult {
  data: any;
  error: any;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => void;
}

/**
 * Custom hook for fetching WooCommerce data with SWR
 * Provides caching, revalidation, and error handling for WooCommerce API requests
 */

export interface UseProductsParams {
  first?: number;
  after?: string;
  sortKey?: string;
  reverse?: boolean;
}

export interface UseCategoryProductsParams {
  slug: string;
  first?: number;
  after?: string;
  sortKey?: string;
  reverse?: boolean;
  filters?: any[];
}

export interface UseSearchProductsParams {
  query: string;
  first?: number;
  after?: string;
  sortKey?: string;
  reverse?: boolean;
  productType?: string[];
  tag?: string[];
  available?: boolean;
}

/**
 * Hook for fetching all products with pagination
 */
export function useProducts(params: UseProductsParams = {}, config?: SWRConfiguration): SWRResponse<any, Error> {
  const { first = 20, after, sortKey = 'date', reverse = false } = params;
  
  // Convert params to WooCommerce format
  const order = reverse ? 'desc' : 'asc';
  
  // Prepare variables in format expected by getProducts
  const variables = {
    first,
    after,
    where: {
      orderby: [{ field: sortKey.toUpperCase(), order }]
    }
  };
  
  return useSWR(
    [`products`, first, after, sortKey, order], 
    () => getProducts(variables),
    {
      revalidateOnFocus: false,
      ...config
    }
  );
}

/**
 * Hook for fetching a product by slug
 */
export function useProduct(slug: string | null, config?: SWRConfiguration): SWRResponse<any, Error> {
  return useSWR(
    slug ? [`product`, slug] : null,
    () => slug ? getProductBySlug(slug) : null,
    {
      revalidateOnFocus: false,
      ...config
    }
  );
}

/**
 * Hook for fetching products in a category with pagination
 */
export function useCategoryProducts(
  params: UseCategoryProductsParams, 
  config?: SWRConfiguration
): SWRResponse<any, Error> {
  const { slug, first = 20, after, sortKey = 'date', reverse = false, filters } = params;
  
  // Convert params to WooCommerce format
  const order = reverse ? 'desc' : 'asc';
  
  // Options for getCategoryProducts
  const options = {
    first,
    after,
    orderby: sortKey,
    order,
    filters
  };
  
  return useSWR(
    slug ? [`category`, slug, first, after, sortKey, order, JSON.stringify(filters)] : null,
    () => slug ? getCategoryProducts(slug, options) : null,
    {
      revalidateOnFocus: false,
      ...config
    }
  );
}

/**
 * Hook for fetching all categories
 */
export function useCategories(
  params: {first?: number, after?: string} = {},
  config?: SWRConfiguration
): SWRResponse<any, Error> {
  const { first = 20, after } = params;
  
  // Prepare variables in format expected by getCategories
  const variables = {
    first,
    after
  };
  
  return useSWR(
    [`categories`, first, after],
    () => getCategories(variables),
    {
      revalidateOnFocus: false,
      ...config
    }
  );
}

/**
 * Hook for searching products with pagination
 */
export function useSearchProducts(
  params: UseSearchProductsParams,
  config?: SWRConfiguration
): SWRResponse<any, Error> {
  const { 
    query, 
    first = 20, 
    after, 
    sortKey = 'date', 
    reverse = false, 
    productType,
    tag,
    available
  } = params;
  
  // Convert params to WooCommerce format
  const order = reverse ? 'desc' : 'asc';
  
  // Prepare variables in format expected by searchProducts
  const searchParams = {
    first,
    after,
    orderby: sortKey,
    order,
    type: productType,
    tag_slug: tag,
    stock_status: available ? 'instock' : undefined
  };
  
  return useSWR(
    query ? [
      `search`, 
      query, 
      first, 
      after, 
      sortKey, 
      order, 
      JSON.stringify(productType), 
      JSON.stringify(tag), 
      available
    ] : null,
    () => query ? searchProducts(query, searchParams) : null,
    {
      revalidateOnFocus: false,
      ...config
    }
  );
}

/**
 * Custom hook for fetching WooCommerce products with pagination support
 * 
 * @param options Options for fetching products
 * @param swrOptions Additional SWR options
 * @returns SWR response with products data
 */
export function useWooProducts(
  options: UseWooProductsOptions = {},
  swrOptions: any = {}
): UseWooProductsResult {
  const {
    first = 12,
    after = null,
    category = '',
    search = '',
    orderBy = 'date',
    order = 'DESC'
  } = options;

  // Create a unique key for SWR based on the query parameters
  const swrKey = JSON.stringify({
    first,
    category,
    search,
    orderBy,
    order,
    after
  });

  // Define the fetcher function that will be used by SWR
  const fetcher = async () => {
    let data;
    
    if (category) {
      data = await woocommerce.getCategoryProducts(category, first);
    } else {
      // Build variables for the GraphQL query
      const variables: any = {
        where: {
          orderby: [{ field: orderBy.toUpperCase(), order }]
        }
      };
      
      // Add search term if provided
      if (search) {
        variables.where.search = search;
      }
      
      // Add cursor-based pagination if 'after' is provided
      if (after) {
        variables.after = after;
      }
      
      data = await woocommerce.getAllProducts(first);
    }
    
    return data;
  };

  // Use SWR for data fetching with caching and revalidation
  const { data, error, isValidating, mutate } = useSWR(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      ...swrOptions
    }
  );

  // Track loading state
  const [isLoading, setIsLoading] = useState(!data && !error);

  // Update loading state when data or error changes
  useEffect(() => {
    setIsLoading(!data && !error);
  }, [data, error]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  };
} 