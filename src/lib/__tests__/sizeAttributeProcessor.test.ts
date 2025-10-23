/**
 * Unit tests for Size Attribute Processor
 */

import { SizeAttributeProcessor, sizeUtils, SizeAttribute, ProductSizeInfo } from '../sizeAttributeProcessor';
import { WooProduct } from '../woocommerce';

// Mock WooCommerce product data
const mockVariableProduct: WooProduct = {
  id: 'product-1',
  databaseId: 123,
  name: 'Test T-Shirt',
  slug: 'test-t-shirt',
  description: 'A test t-shirt',
  shortDescription: 'Test t-shirt',
  type: 'VARIABLE',
  price: '25.00',
  regularPrice: '25.00',
  image: {
    sourceUrl: 'test.jpg',
    altText: 'Test'
  },
  galleryImages: { nodes: [] },
  attributes: {
    nodes: [
      {
        name: 'Size',
        options: ['S', 'M', 'L', 'XL']
      },
      {
        name: 'Color',
        options: ['Red', 'Blue']
      }
    ]
  },
  variations: {
    nodes: [
      {
        id: 'var-1',
        databaseId: 124,
        name: 'Test T-Shirt - S',
        price: '25.00',
        regularPrice: '25.00',
        salePrice: '',
        stockStatus: 'IN_STOCK',
        stockQuantity: 10,
        attributes: {
          nodes: [
            { name: 'Size', value: 'S' },
            { name: 'Color', value: 'Red' }
          ]
        }
      },
      {
        id: 'var-2',
        databaseId: 125,
        name: 'Test T-Shirt - M',
        price: '27.00',
        regularPrice: '27.00',
        salePrice: '',
        stockStatus: 'IN_STOCK',
        stockQuantity: 5,
        attributes: {
          nodes: [
            { name: 'Size', value: 'M' },
            { name: 'Color', value: 'Red' }
          ]
        }
      },
      {
        id: 'var-3',
        databaseId: 126,
        name: 'Test T-Shirt - L',
        price: '29.00',
        regularPrice: '29.00',
        salePrice: '24.00',
        stockStatus: 'IN_STOCK',
        stockQuantity: 2,
        attributes: {
          nodes: [
            { name: 'Size', value: 'L' },
            { name: 'Color', value: 'Red' }
          ]
        }
      },
      {
        id: 'var-4',
        databaseId: 127,
        name: 'Test T-Shirt - XL',
        price: '30.00',
        regularPrice: '30.00',
        salePrice: '',
        stockStatus: 'OUT_OF_STOCK',
        stockQuantity: 0,
        attributes: {
          nodes: [
            { name: 'Size', value: 'XL' },
            { name: 'Color', value: 'Red' }
          ]
        }
      }
    ]
  }
};

const mockSimpleProduct: WooProduct = {
  id: 'product-2',
  databaseId: 128,
  name: 'Simple Product',
  slug: 'simple-product',
  description: 'A simple product',
  shortDescription: 'Simple product',
  type: 'SIMPLE',
  price: '15.00',
  regularPrice: '15.00',
  image: {
    sourceUrl: 'simple.jpg',
    altText: 'Simple'
  },
  galleryImages: { nodes: [] }
};

describe('SizeAttributeProcessor', () => {
  describe('extractSizeAttributes', () => {
    it('should extract size attributes from variable product', () => {
      const result = SizeAttributeProcessor.extractSizeAttributes(mockVariableProduct);
      
      expect(result.productId).toBe('123');
      expect(result.hasSizes).toBe(true);
      expect(result.availableSizes).toHaveLength(4);
      expect(result.defaultSize).toBe('S'); // First available size
      
      // Check individual sizes
      const sizeS = result.availableSizes.find(s => s.value === 'S');
      expect(sizeS).toBeDefined();
      expect(sizeS?.isAvailable).toBe(true);
      expect(sizeS?.stockQuantity).toBe(10);
      expect(sizeS?.variationId).toBe('var-1');
      
      const sizeXL = result.availableSizes.find(s => s.value === 'XL');
      expect(sizeXL).toBeDefined();
      expect(sizeXL?.isAvailable).toBe(false);
      expect(sizeXL?.stockQuantity).toBe(0);
    });

    it('should return empty result for simple product', () => {
      const result = SizeAttributeProcessor.extractSizeAttributes(mockSimpleProduct);
      
      expect(result.productId).toBe('128');
      expect(result.hasSizes).toBe(false);
      expect(result.availableSizes).toHaveLength(0);
      expect(result.defaultSize).toBeUndefined();
    });

    it('should handle product without size attributes', () => {
      const productWithoutSizes = {
        ...mockVariableProduct,
        attributes: {
          nodes: [
            {
              name: 'Color',
              options: ['Red', 'Blue']
            }
          ]
        }
      };

      const result = SizeAttributeProcessor.extractSizeAttributes(productWithoutSizes);
      
      expect(result.hasSizes).toBe(false);
      expect(result.availableSizes).toHaveLength(0);
    });
  });

  describe('findVariationBySize', () => {
    it('should find variation by size value', () => {
      const variations = mockVariableProduct.variations!.nodes;
      const result = SizeAttributeProcessor.findVariationBySize(variations, 'M', 'Size');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('var-2');
      expect(result.price).toBe('27.00');
    });

    it('should return null for non-existent size', () => {
      const variations = mockVariableProduct.variations!.nodes;
      const result = SizeAttributeProcessor.findVariationBySize(variations, 'XXL', 'Size');
      
      expect(result).toBeNull();
    });

    it('should find size attribute name automatically', () => {
      const variations = mockVariableProduct.variations!.nodes;
      const result = SizeAttributeProcessor.findVariationBySize(variations, 'L');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('var-3');
    });
  });

  describe('calculateSizeAvailability', () => {
    it('should calculate availability for all sizes', () => {
      const variations = mockVariableProduct.variations!.nodes;
      const result = SizeAttributeProcessor.calculateSizeAvailability(variations);
      
      expect(result).toHaveLength(4);
      
      const availableSizes = result.filter(s => s.isAvailable);
      const unavailableSizes = result.filter(s => !s.isAvailable);
      
      expect(availableSizes).toHaveLength(3); // S, M, L
      expect(unavailableSizes).toHaveLength(1); // XL
    });

    it('should return empty array for variations without size attributes', () => {
      const variationsWithoutSizes = [
        {
          id: 'var-1',
          attributes: {
            nodes: [{ name: 'Color', value: 'Red' }]
          }
        }
      ];

      const result = SizeAttributeProcessor.calculateSizeAvailability(variationsWithoutSizes);
      expect(result).toHaveLength(0);
    });
  });

  describe('getSizePricing', () => {
    it('should get pricing for specific size', () => {
      const result = SizeAttributeProcessor.getSizePricing(mockVariableProduct, 'L');
      
      expect(result).toBeDefined();
      expect(result?.price).toBe('29.00');
      expect(result?.regularPrice).toBe('29.00');
      expect(result?.salePrice).toBe('24.00');
      expect(result?.onSale).toBe(true);
    });

    it('should return null for simple product', () => {
      const result = SizeAttributeProcessor.getSizePricing(mockSimpleProduct, 'M');
      expect(result).toBeNull();
    });

    it('should return null for non-existent size', () => {
      const result = SizeAttributeProcessor.getSizePricing(mockVariableProduct, 'XXL');
      expect(result).toBeNull();
    });
  });

  describe('validateSizeSelection', () => {
    it('should validate available size selection', () => {
      const result = SizeAttributeProcessor.validateSizeSelection(mockVariableProduct, 'M');
      
      expect(result.isValid).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate unavailable size selection', () => {
      const result = SizeAttributeProcessor.validateSizeSelection(mockVariableProduct, 'XL');
      
      expect(result.isValid).toBe(true);
      expect(result.isAvailable).toBe(false);
      expect(result.error).toBe('Selected size is out of stock');
    });

    it('should invalidate non-existent size selection', () => {
      const result = SizeAttributeProcessor.validateSizeSelection(mockVariableProduct, 'XXL');
      
      expect(result.isValid).toBe(false);
      expect(result.isAvailable).toBe(false);
      expect(result.error).toBe('Invalid size selection');
    });

    it('should validate simple product without size requirement', () => {
      const result = SizeAttributeProcessor.validateSizeSelection(mockSimpleProduct, '');
      
      expect(result.isValid).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});

describe('sizeUtils', () => {
  describe('formatSizeForDisplay', () => {
    it('should format numeric sizes', () => {
      expect(sizeUtils.formatSizeForDisplay('42')).toBe('Size 42');
      expect(sizeUtils.formatSizeForDisplay('10')).toBe('Size 10');
    });

    it('should format letter sizes', () => {
      expect(sizeUtils.formatSizeForDisplay('xs')).toBe('XS');
      expect(sizeUtils.formatSizeForDisplay('xl')).toBe('XL');
    });

    it('should return other sizes as-is', () => {
      expect(sizeUtils.formatSizeForDisplay('One Size')).toBe('One Size');
      expect(sizeUtils.formatSizeForDisplay('Custom')).toBe('Custom');
    });
  });

  describe('sortSizes', () => {
    it('should sort letter sizes correctly', () => {
      const sizes: SizeAttribute[] = [
        { name: 'Size', value: 'XL', slug: 'xl', isAvailable: true },
        { name: 'Size', value: 'S', slug: 's', isAvailable: true },
        { name: 'Size', value: 'M', slug: 'm', isAvailable: true },
        { name: 'Size', value: 'L', slug: 'l', isAvailable: true }
      ];

      const sorted = sizeUtils.sortSizes(sizes);
      const values = sorted.map(s => s.value);
      
      expect(values).toEqual(['S', 'M', 'L', 'XL']);
    });

    it('should sort numeric sizes correctly', () => {
      const sizes: SizeAttribute[] = [
        { name: 'Size', value: '42', slug: '42', isAvailable: true },
        { name: 'Size', value: '38', slug: '38', isAvailable: true },
        { name: 'Size', value: '40', slug: '40', isAvailable: true }
      ];

      const sorted = sizeUtils.sortSizes(sizes);
      const values = sorted.map(s => s.value);
      
      expect(values).toEqual(['38', '40', '42']);
    });

    it('should sort mixed sizes alphabetically', () => {
      const sizes: SizeAttribute[] = [
        { name: 'Size', value: 'Custom', slug: 'custom', isAvailable: true },
        { name: 'Size', value: 'One Size', slug: 'one-size', isAvailable: true },
        { name: 'Size', value: 'Adult', slug: 'adult', isAvailable: true }
      ];

      const sorted = sizeUtils.sortSizes(sizes);
      const values = sorted.map(s => s.value);
      
      expect(values).toEqual(['Adult', 'Custom', 'One Size']);
    });
  });

  describe('isNumericSize', () => {
    it('should identify numeric sizes', () => {
      expect(sizeUtils.isNumericSize('42')).toBe(true);
      expect(sizeUtils.isNumericSize('10.5')).toBe(true);
      expect(sizeUtils.isNumericSize('0')).toBe(true);
    });

    it('should reject non-numeric sizes', () => {
      expect(sizeUtils.isNumericSize('XL')).toBe(false);
      expect(sizeUtils.isNumericSize('Size 42')).toBe(false);
      expect(sizeUtils.isNumericSize('')).toBe(false);
    });
  });

  describe('isLetterSize', () => {
    it('should identify letter sizes', () => {
      expect(sizeUtils.isLetterSize('XS')).toBe(true);
      expect(sizeUtils.isLetterSize('xl')).toBe(true);
      expect(sizeUtils.isLetterSize('M')).toBe(true);
    });

    it('should reject non-letter sizes', () => {
      expect(sizeUtils.isLetterSize('42')).toBe(false);
      expect(sizeUtils.isLetterSize('Size XL')).toBe(false);
      expect(sizeUtils.isLetterSize('Custom')).toBe(false);
    });
  });
});