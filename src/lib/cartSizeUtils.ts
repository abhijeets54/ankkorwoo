/**
 * Cart Size Utilities
 * 
 * Utilities for handling size information in cart items, including
 * size validation, display formatting, and cart operations with sizes.
 */

import { CartItem } from './localCartStore';
import { SizeAttribute } from './sizeAttributeProcessor';

// Extended cart item interface with size-specific helpers
export interface CartItemWithSize extends CartItem {
  selectedSize?: {
    name: string;
    value: string;
    displayName: string;
  };
  sizeSpecificPrice?: string;
}

/**
 * Cart Size Utilities Class
 */
export class CartSizeUtils {
  /**
   * Extract size information from cart item attributes
   */
  static extractSizeFromCartItem(item: CartItem): {
    hasSize: boolean;
    sizeName?: string;
    sizeValue?: string;
    displayName?: string;
  } {
    if (!item.attributes || item.attributes.length === 0) {
      return { hasSize: false };
    }

    // Look for size-related attributes
    const sizeAttribute = item.attributes.find(attr => 
      ['Size', 'size', 'pa_size', 'product_size'].includes(attr.name)
    );

    if (!sizeAttribute) {
      return { hasSize: false };
    }

    return {
      hasSize: true,
      sizeName: sizeAttribute.name,
      sizeValue: sizeAttribute.value,
      displayName: this.formatSizeForDisplay(sizeAttribute.value)
    };
  }

  /**
   * Format size value for display in cart
   */
  static formatSizeForDisplay(sizeValue: string): string {
    // Handle common size formats
    if (/^[0-9]+$/.test(sizeValue)) {
      return `Size ${sizeValue}`;
    }
    
    if (/^[xsmlXSML]+$/i.test(sizeValue)) {
      return sizeValue.toUpperCase();
    }
    
    return sizeValue;
  }

  /**
   * Create a display string for cart item with size
   */
  static createCartItemDisplayName(item: CartItem): string {
    const sizeInfo = this.extractSizeFromCartItem(item);
    
    if (sizeInfo.hasSize && sizeInfo.displayName) {
      return `${item.name} - ${sizeInfo.displayName}`;
    }
    
    return item.name;
  }

  /**
   * Check if two cart items are the same product with same size
   */
  static areItemsIdentical(item1: CartItem, item2: CartItem): boolean {
    // Same product ID
    if (item1.productId !== item2.productId) {
      return false;
    }

    // Same variation ID (if any)
    if (item1.variationId !== item2.variationId) {
      return false;
    }

    // Compare size attributes
    const size1 = this.extractSizeFromCartItem(item1);
    const size2 = this.extractSizeFromCartItem(item2);

    if (size1.hasSize !== size2.hasSize) {
      return false;
    }

    if (size1.hasSize && size2.hasSize) {
      return size1.sizeValue === size2.sizeValue;
    }

    return true;
  }

  /**
   * Generate a unique key for cart item (including size)
   */
  static generateCartItemKey(productId: string, variationId?: string, sizeValue?: string): string {
    const parts = [productId];
    
    if (variationId) {
      parts.push(`var:${variationId}`);
    }
    
    if (sizeValue) {
      parts.push(`size:${sizeValue}`);
    }
    
    return parts.join('|');
  }

  /**
   * Validate size information in cart item
   */
  static validateCartItemSize(item: CartItem): {
    isValid: boolean;
    error?: string;
  } {
    const sizeInfo = this.extractSizeFromCartItem(item);
    
    // If item has variation ID, it should have size information
    if (item.variationId && !sizeInfo.hasSize) {
      return {
        isValid: false,
        error: 'Variation product missing size information'
      };
    }

    // If item has size attribute, validate the value
    if (sizeInfo.hasSize && (!sizeInfo.sizeValue || sizeInfo.sizeValue.trim() === '')) {
      return {
        isValid: false,
        error: 'Invalid size value'
      };
    }

    return { isValid: true };
  }

  /**
   * Update cart item with new size information
   */
  static updateCartItemSize(
    item: CartItem, 
    newSize: SizeAttribute, 
    newVariationId?: string,
    newPrice?: string
  ): CartItem {
    const updatedAttributes = item.attributes ? [...item.attributes] : [];
    
    // Remove existing size attribute
    const filteredAttributes = updatedAttributes.filter(attr => 
      !['Size', 'size', 'pa_size', 'product_size'].includes(attr.name)
    );
    
    // Add new size attribute
    filteredAttributes.push({
      name: newSize.name,
      value: newSize.value
    });

    return {
      ...item,
      attributes: filteredAttributes,
      variationId: newVariationId || item.variationId,
      price: newPrice || item.price
    };
  }

  /**
   * Group cart items by product (ignoring size variations)
   */
  static groupCartItemsByProduct(items: CartItem[]): Record<string, CartItem[]> {
    return items.reduce((groups, item) => {
      const key = item.productId;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, CartItem[]>);
  }

  /**
   * Get size summary for a product in cart
   */
  static getProductSizeSummary(items: CartItem[]): {
    totalQuantity: number;
    sizes: Array<{
      size: string;
      quantity: number;
      displayName: string;
    }>;
  } {
    const sizeSummary: Record<string, { quantity: number; displayName: string }> = {};
    let totalQuantity = 0;

    items.forEach(item => {
      const sizeInfo = this.extractSizeFromCartItem(item);
      const sizeKey = sizeInfo.sizeValue || 'no-size';
      const displayName = sizeInfo.displayName || 'One Size';

      if (!sizeSummary[sizeKey]) {
        sizeSummary[sizeKey] = { quantity: 0, displayName };
      }

      sizeSummary[sizeKey].quantity += item.quantity;
      totalQuantity += item.quantity;
    });

    const sizes = Object.entries(sizeSummary).map(([size, info]) => ({
      size,
      quantity: info.quantity,
      displayName: info.displayName
    }));

    return { totalQuantity, sizes };
  }

  /**
   * Create cart item from product with size selection
   */
  static createCartItemWithSize(
    productId: string,
    name: string,
    price: string,
    quantity: number,
    image?: { url: string; altText?: string },
    size?: SizeAttribute,
    variationId?: string
  ): Omit<CartItem, 'id'> {
    const attributes: Array<{ name: string; value: string }> = [];
    
    if (size) {
      attributes.push({
        name: size.name,
        value: size.value
      });
    }

    return {
      productId,
      variationId,
      quantity,
      name,
      price,
      image,
      attributes: attributes.length > 0 ? attributes : undefined
    };
  }

  /**
   * Format cart item for checkout display
   */
  static formatCartItemForCheckout(item: CartItem): {
    name: string;
    price: string;
    quantity: number;
    attributes: string[];
    total: string;
  } {
    const sizeInfo = this.extractSizeFromCartItem(item);
    const attributes: string[] = [];
    
    if (sizeInfo.hasSize && sizeInfo.displayName) {
      attributes.push(`Size: ${sizeInfo.displayName}`);
    }

    // Add other non-size attributes
    if (item.attributes) {
      item.attributes
        .filter(attr => !['Size', 'size', 'pa_size', 'product_size'].includes(attr.name))
        .forEach(attr => {
          attributes.push(`${attr.name}: ${attr.value}`);
        });
    }

    const numericPrice = parseFloat(item.price.replace(/[^\d.-]/g, ''));
    const total = (numericPrice * item.quantity).toFixed(2);

    return {
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      attributes,
      total
    };
  }

  /**
   * Validate cart for checkout (ensure all items have required size info)
   */
  static validateCartForCheckout(items: CartItem[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    items.forEach((item, index) => {
      const validation = this.validateCartItemSize(item);
      if (!validation.isValid) {
        errors.push(`Item ${index + 1} (${item.name}): ${validation.error}`);
      }

      // Check for potential issues
      if (item.variationId && !this.extractSizeFromCartItem(item).hasSize) {
        warnings.push(`Item ${index + 1} (${item.name}): Variation product without size information`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Helper functions for cart size operations
 */
export const cartSizeHelpers = {
  /**
   * Check if cart item has size
   */
  hasSize: (item: CartItem): boolean => {
    return CartSizeUtils.extractSizeFromCartItem(item).hasSize;
  },

  /**
   * Get size display name for cart item
   */
  getSizeDisplayName: (item: CartItem): string | null => {
    const sizeInfo = CartSizeUtils.extractSizeFromCartItem(item);
    return sizeInfo.hasSize ? sizeInfo.displayName || null : null;
  },

  /**
   * Get full display name for cart item
   */
  getFullDisplayName: (item: CartItem): string => {
    return CartSizeUtils.createCartItemDisplayName(item);
  },

  /**
   * Check if two items can be merged (same product, same size)
   */
  canMergeItems: (item1: CartItem, item2: CartItem): boolean => {
    return CartSizeUtils.areItemsIdentical(item1, item2);
  }
};