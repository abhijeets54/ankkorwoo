/**
 * WooCommerce Size Service
 * 
 * This module extends the existing WooCommerce service with size-specific functionality.
 * It provides enhanced GraphQL queries and helper functions for retrieving and processing
 * size-related product information.
 */

import { gql } from 'graphql-request';
import { fetchFromWooCommerce, WooProduct } from './woocommerce';
import { SizeAttributeProcessor, ProductSizeInfo, SizeAttribute } from './sizeAttributeProcessor';

// Enhanced GraphQL fragments for size-focused queries
export const SIZE_FOCUSED_PRODUCT_FRAGMENT = gql`
  fragment SizeFocusedProductFields on Product {
    id
    databaseId
    name
    slug
    description
    shortDescription
    type
    image {
      sourceUrl
      altText
    }
    galleryImages {
      nodes {
        sourceUrl
        altText
      }
    }
    ... on SimpleProduct {
      price
      regularPrice
      salePrice
      onSale
      stockStatus
      stockQuantity
    }
    ... on VariableProduct {
      price
      regularPrice
      salePrice
      onSale
      stockStatus
      stockQuantity
      attributes {
        nodes {
          name
          options
          variation
        }
      }
      variations {
        nodes {
          id
          databaseId
          name
          price
          regularPrice
          salePrice
          stockStatus
          stockQuantity
          attributes {
            nodes {
              name
              value
            }
          }
        }
      }
    }
  }
`;

// Enhanced queries with size focus
export const GET_PRODUCT_WITH_SIZES = gql`
  query GetProductWithSizes($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      ...SizeFocusedProductFields
    }
  }
  ${SIZE_FOCUSED_PRODUCT_FRAGMENT}
`;

export const GET_PRODUCTS_WITH_SIZES = gql`
  query GetProductsWithSizes(
    $first: Int
    $after: String
    $where: RootQueryToProductConnectionWhereArgs
  ) {
    products(first: $first, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...SizeFocusedProductFields
      }
    }
  }
  ${SIZE_FOCUSED_PRODUCT_FRAGMENT}
`;

export const GET_CATEGORY_PRODUCTS_WITH_SIZES = gql`
  query GetCategoryProductsWithSizes($slug: ID!, $first: Int = 20) {
    productCategory(id: $slug, idType: SLUG) {
      id
      name
      slug
      description
      products(first: $first) {
        nodes {
          ...SizeFocusedProductFields
        }
      }
    }
  }
  ${SIZE_FOCUSED_PRODUCT_FRAGMENT}
`;

// Interface for size-enhanced product data
export interface SizeEnhancedProduct extends WooProduct {
  sizeInfo: ProductSizeInfo;
}

// Interface for size availability response
export interface SizeAvailabilityResponse {
  productId: string;
  sizes: SizeAttribute[];
  lastUpdated: string;
}

// Interface for size pricing response
export interface SizePricingResponse {
  productId: string;
  sizeValue: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  onSale: boolean;
  stockStatus: string;
  stockQuantity: number;
}

/**
 * WooCommerce Size Service Class
 * 
 * Provides methods for retrieving and processing size-specific product information
 */
export class WooCommerceSizeService {
  /**
   * Get a product with enhanced size information
   * 
   * @param slug - Product slug
   * @returns Product with size information
   */
  static async getProductWithSizes(slug: string): Promise<SizeEnhancedProduct | null> {
    try {
      const data = await fetchFromWooCommerce<{ product: WooProduct }>(
        GET_PRODUCT_WITH_SIZES,
        { slug },
        [`product-${slug}`, 'products', 'sizes'],
        60
      );

      if (!data.product) {
        return null;
      }

      const sizeInfo = SizeAttributeProcessor.extractSizeAttributes(data.product);

      return {
        ...data.product,
        sizeInfo
      };
    } catch (error) {
      console.error(`Error fetching product with sizes for slug ${slug}:`, error);
      return null;
    }
  }

  /**
   * Get products with size information
   * 
   * @param variables - Query variables
   * @returns Products with size information
   */
  static async getProductsWithSizes(variables: {
    first?: number;
    after?: string;
    where?: any;
  } = {}): Promise<{
    nodes: SizeEnhancedProduct[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }> {
    try {
      const data = await fetchFromWooCommerce<{
        products: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: WooProduct[];
        };
      }>(
        GET_PRODUCTS_WITH_SIZES,
        {
          first: variables.first || 12,
          after: variables.after || null,
          where: variables.where || {}
        },
        ['products', 'sizes'],
        60
      );

      const enhancedProducts = data.products.nodes.map(product => ({
        ...product,
        sizeInfo: SizeAttributeProcessor.extractSizeAttributes(product)
      }));

      return {
        nodes: enhancedProducts,
        pageInfo: data.products.pageInfo
      };
    } catch (error) {
      console.error('Error fetching products with sizes:', error);
      return {
        nodes: [],
        pageInfo: { hasNextPage: false, endCursor: null }
      };
    }
  }

  /**
   * Get category products with size information
   * 
   * @param slug - Category slug
   * @param first - Number of products to fetch
   * @returns Category products with size information
   */
  static async getCategoryProductsWithSizes(
    slug: string, 
    first = 20
  ): Promise<{
    category: {
      id: string;
      name: string;
      slug: string;
      description: string;
    } | null;
    products: SizeEnhancedProduct[];
  }> {
    try {
      const data = await fetchFromWooCommerce<{
        productCategory?: {
          id: string;
          name: string;
          slug: string;
          description: string;
          products: {
            nodes: WooProduct[];
          };
        };
      }>(
        GET_CATEGORY_PRODUCTS_WITH_SIZES,
        { slug, first },
        [`category-${slug}`, 'categories', 'products', 'sizes'],
        60
      );

      if (!data.productCategory) {
        return { category: null, products: [] };
      }

      const enhancedProducts = data.productCategory.products.nodes.map(product => ({
        ...product,
        sizeInfo: SizeAttributeProcessor.extractSizeAttributes(product)
      }));

      return {
        category: {
          id: data.productCategory.id,
          name: data.productCategory.name,
          slug: data.productCategory.slug,
          description: data.productCategory.description
        },
        products: enhancedProducts
      };
    } catch (error) {
      console.error(`Error fetching category products with sizes for slug ${slug}:`, error);
      return { category: null, products: [] };
    }
  }

  /**
   * Get size availability for a specific product
   * 
   * @param productId - Product ID or slug
   * @returns Size availability information
   */
  static async getSizeAvailability(productId: string): Promise<SizeAvailabilityResponse | null> {
    try {
      // Determine if productId is a slug or ID
      const isSlug = isNaN(parseInt(productId));
      const query = isSlug ? GET_PRODUCT_WITH_SIZES : GET_PRODUCT_BY_ID_WITH_SIZES;
      const variables = isSlug ? { slug: productId } : { id: parseInt(productId) };

      const data = await fetchFromWooCommerce<{ product: WooProduct }>(
        query,
        variables,
        [`product-${productId}`, 'sizes'],
        30 // Shorter cache for availability data
      );

      if (!data.product) {
        return null;
      }

      const sizes = SizeAttributeProcessor.calculateSizeAvailability(
        data.product.variations?.nodes || []
      );

      return {
        productId: data.product.databaseId.toString(),
        sizes,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching size availability for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Get size-specific pricing for a product
   * 
   * @param productId - Product ID or slug
   * @param sizeValue - Selected size value
   * @returns Size-specific pricing information
   */
  static async getSizePricing(
    productId: string, 
    sizeValue: string
  ): Promise<SizePricingResponse | null> {
    try {
      const product = await this.getProductWithSizes(productId);
      if (!product) {
        return null;
      }

      const pricing = SizeAttributeProcessor.getSizePricing(product, sizeValue);
      if (!pricing) {
        return null;
      }

      // Find the specific variation for stock information
      const variation = SizeAttributeProcessor.findVariationBySize(
        product.variations?.nodes || [],
        sizeValue
      );

      return {
        productId: product.databaseId.toString(),
        sizeValue,
        price: pricing.price,
        regularPrice: pricing.regularPrice,
        salePrice: pricing.salePrice,
        onSale: pricing.onSale,
        stockStatus: variation?.stockStatus || 'OUT_OF_STOCK',
        stockQuantity: variation?.stockQuantity || 0
      };
    } catch (error) {
      console.error(`Error fetching size pricing for product ${productId}, size ${sizeValue}:`, error);
      return null;
    }
  }

  /**
   * Validate size selection for a product
   * 
   * @param productId - Product ID or slug
   * @param sizeValue - Selected size value
   * @returns Validation result
   */
  static async validateSizeSelection(
    productId: string, 
    sizeValue: string
  ): Promise<{
    isValid: boolean;
    isAvailable: boolean;
    error?: string;
    suggestion?: string;
  }> {
    try {
      const product = await this.getProductWithSizes(productId);
      if (!product) {
        return {
          isValid: false,
          isAvailable: false,
          error: 'Product not found'
        };
      }

      const validation = SizeAttributeProcessor.validateSizeSelection(product, sizeValue);
      
      // Add suggestions for better UX
      if (!validation.isValid || !validation.isAvailable) {
        const availableSizes = product.sizeInfo.availableSizes
          .filter(size => size.isAvailable)
          .map(size => size.value);
        
        if (availableSizes.length > 0) {
          return {
            ...validation,
            suggestion: `Available sizes: ${availableSizes.join(', ')}`
          };
        }
      }

      return validation;
    } catch (error) {
      console.error(`Error validating size selection for product ${productId}:`, error);
      return {
        isValid: false,
        isAvailable: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * Get products filtered by size availability
   * 
   * @param sizeValue - Size to filter by
   * @param variables - Additional query variables
   * @returns Products that have the specified size available
   */
  static async getProductsBySizeAvailability(
    sizeValue: string,
    variables: {
      first?: number;
      after?: string;
      where?: any;
    } = {}
  ): Promise<{
    nodes: SizeEnhancedProduct[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }> {
    try {
      const allProducts = await this.getProductsWithSizes(variables);
      
      // Filter products that have the specified size available
      const filteredProducts = allProducts.nodes.filter(product => {
        const availableSize = product.sizeInfo.availableSizes.find(
          size => size.value === sizeValue && size.isAvailable
        );
        return Boolean(availableSize);
      });

      return {
        nodes: filteredProducts,
        pageInfo: allProducts.pageInfo
      };
    } catch (error) {
      console.error(`Error fetching products by size availability for size ${sizeValue}:`, error);
      return {
        nodes: [],
        pageInfo: { hasNextPage: false, endCursor: null }
      };
    }
  }

  /**
   * Get size chart information for a product (if available)
   * 
   * @param productId - Product ID or slug
   * @returns Size chart information
   */
  static async getSizeChart(productId: string): Promise<{
    hasChart: boolean;
    chartUrl?: string;
    chartData?: any;
  }> {
    try {
      // This would typically fetch size chart data from WooCommerce
      // For now, we'll return a placeholder implementation
      // In a real implementation, this might fetch from custom fields or a size chart plugin
      
      return {
        hasChart: false,
        chartUrl: undefined,
        chartData: undefined
      };
    } catch (error) {
      console.error(`Error fetching size chart for product ${productId}:`, error);
      return { hasChart: false };
    }
  }
}

// Additional query for getting product by ID with sizes
const GET_PRODUCT_BY_ID_WITH_SIZES = gql`
  query GetProductByIdWithSizes($id: ID!) {
    product(id: $id, idType: DATABASE_ID) {
      ...SizeFocusedProductFields
    }
  }
  ${SIZE_FOCUSED_PRODUCT_FRAGMENT}
`;

// Helper functions for size-specific operations
export const sizeServiceUtils = {
  /**
   * Cache key generator for size-related data
   */
  generateSizeCacheKey: (productId: string, operation: string): string => {
    return `size-${operation}-${productId}`;
  },

  /**
   * Check if a product has size variations
   */
  hasSize: (product: WooProduct): boolean => {
    const sizeInfo = SizeAttributeProcessor.extractSizeAttributes(product);
    return sizeInfo.hasSizes;
  },

  /**
   * Get the default size for a product
   */
  getDefaultSize: (product: WooProduct): string | null => {
    const sizeInfo = SizeAttributeProcessor.extractSizeAttributes(product);
    return sizeInfo.defaultSize || null;
  },

  /**
   * Format size information for display
   */
  formatSizeInfo: (sizeInfo: ProductSizeInfo): string => {
    if (!sizeInfo.hasSizes) {
      return 'One size';
    }

    const availableCount = sizeInfo.availableSizes.filter(s => s.isAvailable).length;
    const totalCount = sizeInfo.availableSizes.length;

    if (availableCount === 0) {
      return 'Out of stock';
    }

    if (availableCount === totalCount) {
      return `${totalCount} sizes available`;
    }

    return `${availableCount} of ${totalCount} sizes available`;
  }
};