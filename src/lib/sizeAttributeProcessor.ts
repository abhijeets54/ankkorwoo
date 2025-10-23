/**
 * Size Attribute Processing Utilities
 * 
 * This module provides utilities for extracting, parsing, and processing size attributes
 * from WooCommerce product data. It handles the identification of size-related attributes
 * and provides methods to work with product variations based on size selections.
 */

import { WooProduct } from './woocommerce';

// Size attribute interface
export interface SizeAttribute {
  name: string;
  value: string;
  slug: string;
  isAvailable: boolean;
  stockQuantity?: number;
  priceModifier?: number;
  variationId?: string;
}

// Product size information interface
export interface ProductSizeInfo {
  productId: string;
  availableSizes: SizeAttribute[];
  defaultSize?: string;
  sizeChart?: string;
  hasSizes: boolean;
}

// Enhanced product variation interface
export interface EnhancedProductVariation {
  id: string;
  databaseId: number;
  name: string;
  price: string;
  regularPrice: string;
  salePrice: string;
  stockStatus: string;
  stockQuantity: number;
  attributes: {
    nodes: Array<{
      name: string;
      value: string;
    }>;
  };
  sizeAttribute?: SizeAttribute;
  isDefaultSize?: boolean;
}

/**
 * Size Attribute Processor Class
 * 
 * Provides static methods for processing size attributes from WooCommerce product data
 */
export class SizeAttributeProcessor {
  // Common size attribute names to look for
  private static readonly SIZE_ATTRIBUTE_NAMES = [
    'size',
    'Size',
    'SIZE',
    'pa_size',
    'pa_Size',
    'pa_SIZE',
    'product_size',
    'Product Size',
    'sizes',
    'Sizes',
    'SIZES'
  ];

  /**
   * Extract size attributes from a WooCommerce product
   * 
   * @param product - WooCommerce product data
   * @returns ProductSizeInfo containing size information
   */
  static extractSizeAttributes(product: WooProduct): ProductSizeInfo {
    const productId = product.databaseId?.toString() || product.id;
    
    // Initialize result
    const result: ProductSizeInfo = {
      productId,
      availableSizes: [],
      hasSizes: false
    };

    // Debug logging
    console.log('Processing product for sizes:', {
      name: product.name,
      type: product.type,
      hasAttributes: !!product.attributes?.nodes,
      hasVariations: !!product.variations?.nodes,
      attributeCount: product.attributes?.nodes?.length || 0,
      variationCount: product.variations?.nodes?.length || 0
    });

    // Check if product is variable and has attributes
    if (product.type !== 'VARIABLE' || !product.attributes?.nodes) {
      console.log('Product is not variable or has no attributes');
      return result;
    }

    // Find size-related attributes
    const sizeAttribute = product.attributes.nodes.find(attr => 
      this.SIZE_ATTRIBUTE_NAMES.includes(attr.name)
    );

    console.log('Found size attribute:', sizeAttribute);

    if (!sizeAttribute || !sizeAttribute.options) {
      console.log('No size attribute found or no options available');
      return result;
    }

    // Process variations to get size-specific information
    const variations = product.variations?.nodes || [];
    console.log('Processing variations:', variations.length);
    
    const sizeVariations = this.processSizeVariations(variations, sizeAttribute.name);
    console.log('Size variations processed:', sizeVariations.length);

    // Create size attributes from variations
    result.availableSizes = sizeAttribute.options.map(sizeValue => {
      const variation = sizeVariations.find(v => 
        v.attributes.nodes.some(attr => 
          attr.name === sizeAttribute.name && attr.value === sizeValue
        )
      );

      const sizeAttr = {
        name: sizeAttribute.name,
        value: sizeValue,
        slug: this.createSizeSlug(sizeValue),
        isAvailable: variation ? this.isVariationAvailable(variation) : false,
        stockQuantity: variation?.stockQuantity,
        priceModifier: variation ? this.calculatePriceModifier(variation, product) : 0,
        variationId: variation?.id
      };

      console.log('Created size attribute:', sizeAttr);
      return sizeAttr;
    });

    // Set default size (first available size)
    const firstAvailableSize = result.availableSizes.find(size => size.isAvailable);
    if (firstAvailableSize) {
      result.defaultSize = firstAvailableSize.value;
    }

    result.hasSizes = result.availableSizes.length > 0;

    console.log('Final size info:', result);
    return result;
  }

  /**
   * Find a product variation by size selection
   * 
   * @param variations - Array of product variations
   * @param sizeValue - Selected size value
   * @param sizeAttributeName - Name of the size attribute
   * @returns Matching variation or null
   */
  static findVariationBySize(
    variations: any[], 
    sizeValue: string, 
    sizeAttributeName?: string
  ): any | null {
    if (!variations || variations.length === 0) {
      return null;
    }

    // If no attribute name provided, try to find it
    if (!sizeAttributeName) {
      sizeAttributeName = this.findSizeAttributeName(variations);
      if (!sizeAttributeName) {
        return null;
      }
    }

    return variations.find(variation => 
      variation.attributes?.nodes?.some((attr: any) => 
        attr.name === sizeAttributeName && attr.value === sizeValue
      )
    ) || null;
  }

  /**
   * Calculate size availability based on variations
   * 
   * @param variations - Array of product variations
   * @returns Array of size attributes with availability
   */
  static calculateSizeAvailability(variations: any[]): SizeAttribute[] {
    if (!variations || variations.length === 0) {
      return [];
    }

    const sizeAttributeName = this.findSizeAttributeName(variations);
    if (!sizeAttributeName) {
      return [];
    }

    // Get unique size values
    const sizeValues = new Set<string>();
    variations.forEach(variation => {
      variation.attributes?.nodes?.forEach((attr: any) => {
        if (attr.name === sizeAttributeName) {
          sizeValues.add(attr.value);
        }
      });
    });

    // Create size attributes
    return Array.from(sizeValues).map(sizeValue => {
      const variation = this.findVariationBySize(variations, sizeValue, sizeAttributeName);
      
      return {
        name: sizeAttributeName!,
        value: sizeValue,
        slug: this.createSizeSlug(sizeValue),
        isAvailable: variation ? this.isVariationAvailable(variation) : false,
        stockQuantity: variation?.stockQuantity,
        variationId: variation?.id
      };
    });
  }

  /**
   * Get size-specific pricing information
   * 
   * @param product - WooCommerce product
   * @param sizeValue - Selected size value
   * @returns Price information for the selected size
   */
  static getSizePricing(product: WooProduct, sizeValue: string): {
    price: string;
    regularPrice: string;
    salePrice: string;
    onSale: boolean;
  } | null {
    if (!product.variations?.nodes) {
      return null;
    }

    const sizeAttributeName = this.findSizeAttributeName(product.variations.nodes);
    if (!sizeAttributeName) {
      return null;
    }

    const variation = this.findVariationBySize(
      product.variations.nodes, 
      sizeValue, 
      sizeAttributeName
    );

    if (!variation) {
      return null;
    }

    return {
      price: variation.price || product.price || '0',
      regularPrice: variation.regularPrice || product.regularPrice || '0',
      salePrice: variation.salePrice || product.salePrice || '0',
      onSale: Boolean(variation.salePrice && parseFloat(variation.salePrice) < parseFloat(variation.regularPrice || variation.price || '0'))
    };
  }

  /**
   * Validate if a size selection is valid for a product
   * 
   * @param product - WooCommerce product
   * @param sizeValue - Selected size value
   * @returns Validation result
   */
  static validateSizeSelection(product: WooProduct, sizeValue: string): {
    isValid: boolean;
    isAvailable: boolean;
    error?: string;
  } {
    const sizeInfo = this.extractSizeAttributes(product);
    
    if (!sizeInfo.hasSizes) {
      return { isValid: true, isAvailable: true }; // Simple product, no size required
    }

    const selectedSize = sizeInfo.availableSizes.find(size => size.value === sizeValue);
    
    if (!selectedSize) {
      return {
        isValid: false,
        isAvailable: false,
        error: 'Invalid size selection'
      };
    }

    if (!selectedSize.isAvailable) {
      return {
        isValid: true,
        isAvailable: false,
        error: 'Selected size is out of stock'
      };
    }

    return { isValid: true, isAvailable: true };
  }

  // Private helper methods

  /**
   * Process variations to extract size-specific information
   */
  private static processSizeVariations(variations: any[], sizeAttributeName: string): any[] {
    return variations.filter(variation => 
      variation.attributes?.nodes?.some((attr: any) => attr.name === sizeAttributeName)
    );
  }

  /**
   * Check if a variation is available (in stock)
   */
  private static isVariationAvailable(variation: any): boolean {
    const stockStatus = variation.stockStatus?.toLowerCase();
    return stockStatus === 'in_stock' || stockStatus === 'instock' || 
           (variation.stockQuantity && variation.stockQuantity > 0);
  }

  /**
   * Calculate price modifier for a variation compared to base product
   */
  private static calculatePriceModifier(variation: any, baseProduct: WooProduct): number {
    const variationPrice = parseFloat(variation.price || '0');
    const basePrice = parseFloat(baseProduct.price || '0');
    return variationPrice - basePrice;
  }

  /**
   * Create a URL-friendly slug from size value
   */
  private static createSizeSlug(sizeValue: string): string {
    return sizeValue
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Find the size attribute name from variations
   */
  private static findSizeAttributeName(variations: any[]): string | null {
    for (const variation of variations) {
      if (!variation.attributes?.nodes) continue;
      
      for (const attr of variation.attributes.nodes) {
        if (this.SIZE_ATTRIBUTE_NAMES.includes(attr.name)) {
          return attr.name;
        }
      }
    }
    return null;
  }
}

/**
 * Utility functions for size processing
 */
export const sizeUtils = {
  /**
   * Format size value for display
   */
  formatSizeForDisplay: (sizeValue: string): string => {
    // Handle common size formats
    if (/^[0-9]+$/.test(sizeValue)) {
      return `Size ${sizeValue}`;
    }
    
    if (/^[xsmlXSML]+$/i.test(sizeValue)) {
      return sizeValue.toUpperCase();
    }
    
    return sizeValue;
  },

  /**
   * Sort sizes in logical order
   */
  sortSizes: (sizes: SizeAttribute[]): SizeAttribute[] => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    
    return sizes.sort((a, b) => {
      const aUpper = a.value.toUpperCase();
      const bUpper = b.value.toUpperCase();
      
      // Check if both are in the standard size order
      const aIndex = sizeOrder.indexOf(aUpper);
      const bIndex = sizeOrder.indexOf(bUpper);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Check if both are numeric
      const aNum = parseInt(a.value);
      const bNum = parseInt(b.value);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      
      // Default alphabetical sort
      return a.value.localeCompare(b.value);
    });
  },

  /**
   * Check if a size value represents a numeric size
   */
  isNumericSize: (sizeValue: string): boolean => {
    return /^[0-9]+(\.[0-9]+)?$/.test(sizeValue);
  },

  /**
   * Check if a size value represents a letter size (XS, S, M, L, etc.)
   */
  isLetterSize: (sizeValue: string): boolean => {
    return /^[xsmlXSML]+$/i.test(sizeValue);
  }
};