/**
 * Unit tests for Cart Size Utilities
 */

import { CartSizeUtils, cartSizeHelpers } from '../cartSizeUtils';
import { CartItem } from '../localCartStore';
import { SizeAttribute } from '../sizeAttributeProcessor';

// Mock cart items
const mockCartItemWithSize: CartItem = {
  id: 'item-1',
  productId: 'product-123',
  variationId: 'var-456',
  quantity: 2,
  name: 'Test T-Shirt',
  price: '25.00',
  image: {
    url: 'test.jpg',
    altText: 'Test T-Shirt'
  },
  attributes: [
    { name: 'Size', value: 'M' },
    { name: 'Color', value: 'Red' }
  ]
};

const mockCartItemWithoutSize: CartItem = {
  id: 'item-2',
  productId: 'product-456',
  quantity: 1,
  name: 'Simple Product',
  price: '15.00',
  image: {
    url: 'simple.jpg',
    altText: 'Simple Product'
  }
};

const mockCartItemWithNumericSize: CartItem = {
  id: 'item-3',
  productId: 'product-789',
  variationId: 'var-789',
  quantity: 1,
  name: 'Shoes',
  price: '80.00',
  attributes: [
    { name: 'Size', value: '42' }
  ]
};

const mockSizeAttribute: SizeAttribute = {
  name: 'Size',
  value: 'L',
  slug: 'l',
  isAvailable: true,
  stockQuantity: 5
};

describe('CartSizeUtils', () => {
  describe('extractSizeFromCartItem', () => {
    it('should extract size information from cart item with size', () => {
      const result = CartSizeUtils.extractSizeFromCartItem(mockCartItemWithSize);
      
      expect(result.hasSize).toBe(true);
      expect(result.sizeName).toBe('Size');
      expect(result.sizeValue).toBe('M');
      expect(result.displayName).toBe('M');
    });

    it('should handle cart item without size', () => {
      const result = CartSizeUtils.extractSizeFromCartItem(mockCartItemWithoutSize);
      
      expect(result.hasSize).toBe(false);
      expect(result.sizeName).toBeUndefined();
      expect(result.sizeValue).toBeUndefined();
      expect(result.displayName).toBeUndefined();
    });

    it('should handle numeric sizes', () => {
      const result = CartSizeUtils.extractSizeFromCartItem(mockCartItemWithNumericSize);
      
      expect(result.hasSize).toBe(true);
      expect(result.sizeValue).toBe('42');
      expect(result.displayName).toBe('Size 42');
    });

    it('should handle cart item without attributes', () => {
      const itemWithoutAttrs = { ...mockCartItemWithoutSize, attributes: undefined };
      const result = CartSizeUtils.extractSizeFromCartItem(itemWithoutAttrs);
      
      expect(result.hasSize).toBe(false);
    });
  });

  describe('formatSizeForDisplay', () => {
    it('should format numeric sizes', () => {
      expect(CartSizeUtils.formatSizeForDisplay('42')).toBe('Size 42');
      expect(CartSizeUtils.formatSizeForDisplay('10')).toBe('Size 10');
    });

    it('should format letter sizes', () => {
      expect(CartSizeUtils.formatSizeForDisplay('xs')).toBe('XS');
      expect(CartSizeUtils.formatSizeForDisplay('xl')).toBe('XL');
      expect(CartSizeUtils.formatSizeForDisplay('m')).toBe('M');
    });

    it('should return other sizes as-is', () => {
      expect(CartSizeUtils.formatSizeForDisplay('One Size')).toBe('One Size');
      expect(CartSizeUtils.formatSizeForDisplay('Custom')).toBe('Custom');
    });
  });

  describe('createCartItemDisplayName', () => {
    it('should create display name with size', () => {
      const result = CartSizeUtils.createCartItemDisplayName(mockCartItemWithSize);
      expect(result).toBe('Test T-Shirt - M');
    });

    it('should create display name without size', () => {
      const result = CartSizeUtils.createCartItemDisplayName(mockCartItemWithoutSize);
      expect(result).toBe('Simple Product');
    });

    it('should create display name with numeric size', () => {
      const result = CartSizeUtils.createCartItemDisplayName(mockCartItemWithNumericSize);
      expect(result).toBe('Shoes - Size 42');
    });
  });

  describe('areItemsIdentical', () => {
    it('should identify identical items', () => {
      const item1 = { ...mockCartItemWithSize };
      const item2 = { ...mockCartItemWithSize, id: 'different-id', quantity: 3 };
      
      const result = CartSizeUtils.areItemsIdentical(item1, item2);
      expect(result).toBe(true);
    });

    it('should identify different products', () => {
      const result = CartSizeUtils.areItemsIdentical(mockCartItemWithSize, mockCartItemWithoutSize);
      expect(result).toBe(false);
    });

    it('should identify different sizes', () => {
      const item2 = {
        ...mockCartItemWithSize,
        attributes: [{ name: 'Size', value: 'L' }]
      };
      
      const result = CartSizeUtils.areItemsIdentical(mockCartItemWithSize, item2);
      expect(result).toBe(false);
    });

    it('should identify different variations', () => {
      const item2 = { ...mockCartItemWithSize, variationId: 'different-var' };
      
      const result = CartSizeUtils.areItemsIdentical(mockCartItemWithSize, item2);
      expect(result).toBe(false);
    });

    it('should handle items with and without sizes', () => {
      const result = CartSizeUtils.areItemsIdentical(mockCartItemWithSize, mockCartItemWithoutSize);
      expect(result).toBe(false);
    });
  });

  describe('generateCartItemKey', () => {
    it('should generate key with product ID only', () => {
      const result = CartSizeUtils.generateCartItemKey('product-123');
      expect(result).toBe('product-123');
    });

    it('should generate key with variation ID', () => {
      const result = CartSizeUtils.generateCartItemKey('product-123', 'var-456');
      expect(result).toBe('product-123|var:var-456');
    });

    it('should generate key with size', () => {
      const result = CartSizeUtils.generateCartItemKey('product-123', undefined, 'M');
      expect(result).toBe('product-123|size:M');
    });

    it('should generate key with all parameters', () => {
      const result = CartSizeUtils.generateCartItemKey('product-123', 'var-456', 'M');
      expect(result).toBe('product-123|var:var-456|size:M');
    });
  });

  describe('validateCartItemSize', () => {
    it('should validate item with size', () => {
      const result = CartSizeUtils.validateCartItemSize(mockCartItemWithSize);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate item without size', () => {
      const result = CartSizeUtils.validateCartItemSize(mockCartItemWithoutSize);
      expect(result.isValid).toBe(true);
    });

    it('should invalidate variation without size', () => {
      const invalidItem = {
        ...mockCartItemWithoutSize,
        variationId: 'var-123'
      };
      
      const result = CartSizeUtils.validateCartItemSize(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Variation product missing size information');
    });

    it('should invalidate empty size value', () => {
      const invalidItem = {
        ...mockCartItemWithSize,
        attributes: [{ name: 'Size', value: '' }]
      };
      
      const result = CartSizeUtils.validateCartItemSize(invalidItem);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid size value');
    });
  });

  describe('updateCartItemSize', () => {
    it('should update cart item with new size', () => {
      const result = CartSizeUtils.updateCartItemSize(
        mockCartItemWithSize,
        mockSizeAttribute,
        'new-var-id',
        '30.00'
      );

      expect(result.variationId).toBe('new-var-id');
      expect(result.price).toBe('30.00');
      
      const sizeAttr = result.attributes?.find(attr => attr.name === 'Size');
      expect(sizeAttr?.value).toBe('L');
      
      // Should keep other attributes
      const colorAttr = result.attributes?.find(attr => attr.name === 'Color');
      expect(colorAttr?.value).toBe('Red');
    });

    it('should add size to item without size', () => {
      const result = CartSizeUtils.updateCartItemSize(
        mockCartItemWithoutSize,
        mockSizeAttribute
      );

      const sizeAttr = result.attributes?.find(attr => attr.name === 'Size');
      expect(sizeAttr?.value).toBe('L');
    });
  });

  describe('groupCartItemsByProduct', () => {
    it('should group items by product ID', () => {
      const items = [
        mockCartItemWithSize,
        mockCartItemWithoutSize,
        { ...mockCartItemWithSize, id: 'item-4', attributes: [{ name: 'Size', value: 'L' }] }
      ];

      const result = CartSizeUtils.groupCartItemsByProduct(items);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['product-123']).toHaveLength(2);
      expect(result['product-456']).toHaveLength(1);
    });
  });

  describe('getProductSizeSummary', () => {
    it('should create size summary for product', () => {
      const items = [
        mockCartItemWithSize, // Size M, quantity 2
        { ...mockCartItemWithSize, id: 'item-5', quantity: 1, attributes: [{ name: 'Size', value: 'L' }] }, // Size L, quantity 1
        { ...mockCartItemWithSize, id: 'item-6', quantity: 3, attributes: [{ name: 'Size', value: 'M' }] } // Size M, quantity 3
      ];

      const result = CartSizeUtils.getProductSizeSummary(items);

      expect(result.totalQuantity).toBe(6);
      expect(result.sizes).toHaveLength(2);
      
      const sizeM = result.sizes.find(s => s.size === 'M');
      expect(sizeM?.quantity).toBe(5); // 2 + 3
      
      const sizeL = result.sizes.find(s => s.size === 'L');
      expect(sizeL?.quantity).toBe(1);
    });

    it('should handle items without sizes', () => {
      const items = [mockCartItemWithoutSize];
      const result = CartSizeUtils.getProductSizeSummary(items);

      expect(result.totalQuantity).toBe(1);
      expect(result.sizes).toHaveLength(1);
      expect(result.sizes[0].displayName).toBe('One Size');
    });
  });

  describe('createCartItemWithSize', () => {
    it('should create cart item with size', () => {
      const result = CartSizeUtils.createCartItemWithSize(
        'product-123',
        'Test Product',
        '25.00',
        2,
        { url: 'test.jpg', altText: 'Test' },
        mockSizeAttribute,
        'var-456'
      );

      expect(result.productId).toBe('product-123');
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe('25.00');
      expect(result.quantity).toBe(2);
      expect(result.variationId).toBe('var-456');
      expect(result.attributes).toHaveLength(1);
      expect(result.attributes?.[0].name).toBe('Size');
      expect(result.attributes?.[0].value).toBe('L');
    });

    it('should create cart item without size', () => {
      const result = CartSizeUtils.createCartItemWithSize(
        'product-123',
        'Test Product',
        '25.00',
        1
      );

      expect(result.attributes).toBeUndefined();
      expect(result.variationId).toBeUndefined();
    });
  });

  describe('formatCartItemForCheckout', () => {
    it('should format cart item with size for checkout', () => {
      const result = CartSizeUtils.formatCartItemForCheckout(mockCartItemWithSize);

      expect(result.name).toBe('Test T-Shirt');
      expect(result.price).toBe('25.00');
      expect(result.quantity).toBe(2);
      expect(result.total).toBe('50.00');
      expect(result.attributes).toContain('Size: M');
      expect(result.attributes).toContain('Color: Red');
    });

    it('should format cart item without size for checkout', () => {
      const result = CartSizeUtils.formatCartItemForCheckout(mockCartItemWithoutSize);

      expect(result.attributes).toHaveLength(0);
      expect(result.total).toBe('15.00');
    });
  });

  describe('validateCartForCheckout', () => {
    it('should validate valid cart', () => {
      const items = [mockCartItemWithSize, mockCartItemWithoutSize];
      const result = CartSizeUtils.validateCartForCheckout(items);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify invalid items', () => {
      const invalidItem = {
        ...mockCartItemWithoutSize,
        variationId: 'var-123' // Variation without size
      };
      
      const items = [mockCartItemWithSize, invalidItem];
      const result = CartSizeUtils.validateCartForCheckout(items);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Variation product missing size information');
    });
  });
});

describe('cartSizeHelpers', () => {
  describe('hasSize', () => {
    it('should detect items with size', () => {
      expect(cartSizeHelpers.hasSize(mockCartItemWithSize)).toBe(true);
    });

    it('should detect items without size', () => {
      expect(cartSizeHelpers.hasSize(mockCartItemWithoutSize)).toBe(false);
    });
  });

  describe('getSizeDisplayName', () => {
    it('should get size display name', () => {
      expect(cartSizeHelpers.getSizeDisplayName(mockCartItemWithSize)).toBe('M');
    });

    it('should return null for items without size', () => {
      expect(cartSizeHelpers.getSizeDisplayName(mockCartItemWithoutSize)).toBeNull();
    });
  });

  describe('getFullDisplayName', () => {
    it('should get full display name with size', () => {
      expect(cartSizeHelpers.getFullDisplayName(mockCartItemWithSize)).toBe('Test T-Shirt - M');
    });

    it('should get full display name without size', () => {
      expect(cartSizeHelpers.getFullDisplayName(mockCartItemWithoutSize)).toBe('Simple Product');
    });
  });

  describe('canMergeItems', () => {
    it('should identify mergeable items', () => {
      const item1 = { ...mockCartItemWithSize };
      const item2 = { ...mockCartItemWithSize, id: 'different-id' };
      
      expect(cartSizeHelpers.canMergeItems(item1, item2)).toBe(true);
    });

    it('should identify non-mergeable items', () => {
      expect(cartSizeHelpers.canMergeItems(mockCartItemWithSize, mockCartItemWithoutSize)).toBe(false);
    });
  });
});