/**
 * Unit tests for WooCommerce Size Service
 */

import { WooCommerceSizeService, sizeServiceUtils } from '../woocommerceSizeService';
import { WooProduct } from '../woocommerce';

// Mock the fetchFromWooCommerce function
jest.mock('../woocommerce', () => ({
  ...jest.requireActual('../woocommerce'),
  fetchFromWooCommerce: jest.fn()
}));

import { fetchFromWooCommerce } from '../woocommerce';
const mockFetchFromWooCommerce = fetchFromWooCommerce as jest.MockedFunction<typeof fetchFromWooCommerce>;

// Mock product data
const mockProductWithSizes: WooProduct = {
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
          nodes: [{ name: 'Size', value: 'S' }]
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
          nodes: [{ name: 'Size', value: 'M' }]
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
          nodes: [{ name: 'Size', value: 'L' }]
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
          nodes: [{ name: 'Size', value: 'XL' }]
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

describe('WooCommerceSizeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductWithSizes', () => {
    it('should fetch product with size information', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({
        product: mockProductWithSizes
      });

      const result = await WooCommerceSizeService.getProductWithSizes('test-t-shirt');

      expect(result).toBeDefined();
      expect(result?.id).toBe('product-1');
      expect(result?.sizeInfo.hasSizes).toBe(true);
      expect(result?.sizeInfo.availableSizes).toHaveLength(4);
      expect(result?.sizeInfo.defaultSize).toBe('S');

      expect(mockFetchFromWooCommerce).toHaveBeenCalledWith(
        expect.any(String),
        { slug: 'test-t-shirt' },
        ['product-test-t-shirt', 'products', 'sizes'],
        60
      );
    });

    it('should return null for non-existent product', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({ product: null });

      const result = await WooCommerceSizeService.getProductWithSizes('non-existent');

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockFetchFromWooCommerce.mockRejectedValue(new Error('API Error'));

      const result = await WooCommerceSizeService.getProductWithSizes('test-product');

      expect(result).toBeNull();
    });
  });

  describe('getProductsWithSizes', () => {
    it('should fetch products with size information', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({
        products: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [mockProductWithSizes, mockSimpleProduct]
        }
      });

      const result = await WooCommerceSizeService.getProductsWithSizes({ first: 10 });

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].sizeInfo.hasSizes).toBe(true);
      expect(result.nodes[1].sizeInfo.hasSizes).toBe(false);
      expect(result.pageInfo.hasNextPage).toBe(false);

      expect(mockFetchFromWooCommerce).toHaveBeenCalledWith(
        expect.any(String),
        { first: 10, after: null, where: {} },
        ['products', 'sizes'],
        60
      );
    });

    it('should handle empty results', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({
        products: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: []
        }
      });

      const result = await WooCommerceSizeService.getProductsWithSizes();

      expect(result.nodes).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('getCategoryProductsWithSizes', () => {
    it('should fetch category products with size information', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({
        productCategory: {
          id: 'cat-1',
          name: 'T-Shirts',
          slug: 't-shirts',
          description: 'T-Shirt category',
          products: {
            nodes: [mockProductWithSizes]
          }
        }
      });

      const result = await WooCommerceSizeService.getCategoryProductsWithSizes('t-shirts');

      expect(result.category).toBeDefined();
      expect(result.category?.name).toBe('T-Shirts');
      expect(result.products).toHaveLength(1);
      expect(result.products[0].sizeInfo.hasSizes).toBe(true);

      expect(mockFetchFromWooCommerce).toHaveBeenCalledWith(
        expect.any(String),
        { slug: 't-shirts', first: 20 },
        ['category-t-shirts', 'categories', 'products', 'sizes'],
        60
      );
    });

    it('should handle non-existent category', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({
        productCategory: null
      });

      const result = await WooCommerceSizeService.getCategoryProductsWithSizes('non-existent');

      expect(result.category).toBeNull();
      expect(result.products).toHaveLength(0);
    });
  });

  describe('getSizeAvailability', () => {
    it('should get size availability for product slug', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({
        product: mockProductWithSizes
      });

      const result = await WooCommerceSizeService.getSizeAvailability('test-t-shirt');

      expect(result).toBeDefined();
      expect(result?.productId).toBe('123');
      expect(result?.sizes).toHaveLength(4);
      expect(result?.lastUpdated).toBeDefined();

      const availableSizes = result?.sizes.filter(s => s.isAvailable);
      expect(availableSizes).toHaveLength(3); // S, M, L are available
    });

    it('should get size availability for product ID', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({
        product: mockProductWithSizes
      });

      const result = await WooCommerceSizeService.getSizeAvailability('123');

      expect(result).toBeDefined();
      expect(result?.productId).toBe('123');
    });

    it('should return null for non-existent product', async () => {
      mockFetchFromWooCommerce.mockResolvedValue({ product: null });

      const result = await WooCommerceSizeService.getSizeAvailability('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSizePricing', () => {
    it('should get size-specific pricing', async () => {
      // Mock the getProductWithSizes method
      jest.spyOn(WooCommerceSizeService, 'getProductWithSizes').mockResolvedValue({
        ...mockProductWithSizes,
        sizeInfo: {
          productId: '123',
          availableSizes: [],
          hasSizes: true
        }
      });

      const result = await WooCommerceSizeService.getSizePricing('test-t-shirt', 'L');

      expect(result).toBeDefined();
      expect(result?.productId).toBe('123');
      expect(result?.sizeValue).toBe('L');
      expect(result?.price).toBe('29.00');
      expect(result?.salePrice).toBe('24.00');
      expect(result?.onSale).toBe(true);
      expect(result?.stockStatus).toBe('IN_STOCK');
      expect(result?.stockQuantity).toBe(2);
    });

    it('should return null for non-existent size', async () => {
      jest.spyOn(WooCommerceSizeService, 'getProductWithSizes').mockResolvedValue({
        ...mockProductWithSizes,
        sizeInfo: {
          productId: '123',
          availableSizes: [],
          hasSizes: true
        }
      });

      const result = await WooCommerceSizeService.getSizePricing('test-t-shirt', 'XXL');

      expect(result).toBeNull();
    });
  });

  describe('validateSizeSelection', () => {
    it('should validate available size selection', async () => {
      jest.spyOn(WooCommerceSizeService, 'getProductWithSizes').mockResolvedValue({
        ...mockProductWithSizes,
        sizeInfo: {
          productId: '123',
          availableSizes: [
            { name: 'Size', value: 'M', slug: 'm', isAvailable: true, stockQuantity: 5 }
          ],
          hasSizes: true
        }
      });

      const result = await WooCommerceSizeService.validateSizeSelection('test-t-shirt', 'M');

      expect(result.isValid).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should provide suggestions for invalid selections', async () => {
      jest.spyOn(WooCommerceSizeService, 'getProductWithSizes').mockResolvedValue({
        ...mockProductWithSizes,
        sizeInfo: {
          productId: '123',
          availableSizes: [
            { name: 'Size', value: 'S', slug: 's', isAvailable: true },
            { name: 'Size', value: 'M', slug: 'm', isAvailable: true },
            { name: 'Size', value: 'XL', slug: 'xl', isAvailable: false }
          ],
          hasSizes: true
        }
      });

      const result = await WooCommerceSizeService.validateSizeSelection('test-t-shirt', 'XXL');

      expect(result.isValid).toBe(false);
      expect(result.isAvailable).toBe(false);
      expect(result.suggestion).toBe('Available sizes: S, M');
    });
  });

  describe('getProductsBySizeAvailability', () => {
    it('should filter products by size availability', async () => {
      jest.spyOn(WooCommerceSizeService, 'getProductsWithSizes').mockResolvedValue({
        nodes: [
          {
            ...mockProductWithSizes,
            sizeInfo: {
              productId: '123',
              availableSizes: [
                { name: 'Size', value: 'M', slug: 'm', isAvailable: true }
              ],
              hasSizes: true
            }
          },
          {
            ...mockSimpleProduct,
            sizeInfo: {
              productId: '128',
              availableSizes: [],
              hasSizes: false
            }
          }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      });

      const result = await WooCommerceSizeService.getProductsBySizeAvailability('M');

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('product-1');
    });
  });
});

describe('sizeServiceUtils', () => {
  describe('generateSizeCacheKey', () => {
    it('should generate cache key', () => {
      const key = sizeServiceUtils.generateSizeCacheKey('123', 'availability');
      expect(key).toBe('size-availability-123');
    });
  });

  describe('hasSize', () => {
    it('should detect products with sizes', () => {
      const result = sizeServiceUtils.hasSize(mockProductWithSizes);
      expect(result).toBe(true);
    });

    it('should detect products without sizes', () => {
      const result = sizeServiceUtils.hasSize(mockSimpleProduct);
      expect(result).toBe(false);
    });
  });

  describe('getDefaultSize', () => {
    it('should get default size for variable product', () => {
      const result = sizeServiceUtils.getDefaultSize(mockProductWithSizes);
      expect(result).toBe('S'); // First available size
    });

    it('should return null for simple product', () => {
      const result = sizeServiceUtils.getDefaultSize(mockSimpleProduct);
      expect(result).toBeNull();
    });
  });

  describe('formatSizeInfo', () => {
    it('should format size info for products with sizes', () => {
      const sizeInfo = {
        productId: '123',
        availableSizes: [
          { name: 'Size', value: 'S', slug: 's', isAvailable: true },
          { name: 'Size', value: 'M', slug: 'm', isAvailable: true },
          { name: 'Size', value: 'L', slug: 'l', isAvailable: false }
        ],
        hasSizes: true
      };

      const result = sizeServiceUtils.formatSizeInfo(sizeInfo);
      expect(result).toBe('2 of 3 sizes available');
    });

    it('should format size info for products without sizes', () => {
      const sizeInfo = {
        productId: '123',
        availableSizes: [],
        hasSizes: false
      };

      const result = sizeServiceUtils.formatSizeInfo(sizeInfo);
      expect(result).toBe('One size');
    });

    it('should format size info for out of stock products', () => {
      const sizeInfo = {
        productId: '123',
        availableSizes: [
          { name: 'Size', value: 'S', slug: 's', isAvailable: false },
          { name: 'Size', value: 'M', slug: 'm', isAvailable: false }
        ],
        hasSizes: true
      };

      const result = sizeServiceUtils.formatSizeInfo(sizeInfo);
      expect(result).toBe('Out of stock');
    });
  });
});