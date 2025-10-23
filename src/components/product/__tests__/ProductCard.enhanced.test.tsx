/**
 * Unit tests for enhanced ProductCard component with size selection
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from '../ProductCard';
import { WooProduct } from '@/lib/woocommerce';

// Mock dependencies
jest.mock('@/lib/localCartStore');
jest.mock('@/lib/store');
jest.mock('@/components/providers/CustomerProvider');
jest.mock('@/components/cart/CartProvider');
jest.mock('@/hooks/useSimpleStockUpdates');
jest.mock('react-hot-toast');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  }
}));

// Mock product data with sizes
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

// Mock hooks
const mockAddToCart = jest.fn();
const mockOpenCart = jest.fn();
const mockAddToWishlist = jest.fn();
const mockIsInWishlist = jest.fn().mockReturnValue(false);
const mockRemoveFromWishlist = jest.fn();

jest.mock('@/lib/localCartStore', () => ({
  useLocalCartStore: () => ({
    addToCart: mockAddToCart
  })
}));

jest.mock('@/components/cart/CartProvider', () => ({
  useCart: () => ({
    openCart: mockOpenCart
  })
}));

jest.mock('@/lib/store', () => ({
  useWishlistStore: () => ({
    addToWishlist: mockAddToWishlist,
    isInWishlist: mockIsInWishlist,
    removeFromWishlist: mockRemoveFromWishlist
  })
}));

jest.mock('@/components/providers/CustomerProvider', () => ({
  useCustomer: () => ({
    isAuthenticated: true
  })
}));

jest.mock('@/hooks/useSimpleStockUpdates', () => ({
  useSimpleStockUpdates: () => ({
    stockStatus: 'IN_STOCK',
    stockQuantity: 10
  })
}));

describe('ProductCard with Size Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Size Selector Display', () => {
    it('should show size selector for variable products', () => {
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      expect(screen.getByTestId('size-selector')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-s')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-m')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-l')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-xl')).toBeInTheDocument();
    });

    it('should not show size selector for simple products', () => {
      render(
        <ProductCard
          id="128"
          name="Simple Product"
          price="15.00"
          image="simple.jpg"
          slug="simple-product"
          type="SIMPLE"
          product={mockSimpleProduct}
          showSizeSelector={true}
        />
      );

      expect(screen.queryByTestId('size-selector')).not.toBeInTheDocument();
    });

    it('should not show size selector when showSizeSelector is false', () => {
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={false}
        />
      );

      expect(screen.queryByTestId('size-selector')).not.toBeInTheDocument();
    });

    it('should show availability indicator for selected size', async () => {
      const user = userEvent.setup();
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      // Select a size
      await user.click(screen.getByTestId('size-option-m'));

      // Should show availability indicator
      expect(screen.getByTestId('size-availability-indicator')).toBeInTheDocument();
    });
  });

  describe('Size Selection', () => {
    it('should handle size selection', async () => {
      const user = userEvent.setup();
      const mockOnSizeChange = jest.fn();
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
          onSizeChange={mockOnSizeChange}
        />
      );

      await user.click(screen.getByTestId('size-option-m'));

      expect(mockOnSizeChange).toHaveBeenCalledWith('M');
    });

    it('should set default size when provided', () => {
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
          defaultSize="L"
        />
      );

      const sizeL = screen.getByTestId('size-option-l');
      expect(sizeL).toHaveAttribute('aria-pressed', 'true');
    });

    it('should update price when size changes', async () => {
      const user = userEvent.setup();
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      // Select size M (price: 27.00)
      await user.click(screen.getByTestId('size-option-m'));

      await waitFor(() => {
        expect(screen.getByText('$27.00')).toBeInTheDocument();
      });
    });
  });

  describe('Add to Cart with Size', () => {
    it('should prevent add to cart without size selection for variable products', async () => {
      const user = userEvent.setup();
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(mockAddToCart).not.toHaveBeenCalled();
      expect(screen.getByText('Please select a size')).toBeInTheDocument();
    });

    it('should add to cart with size information when size is selected', async () => {
      const user = userEvent.setup();
      mockAddToCart.mockResolvedValue(undefined);
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      // Select size M
      await user.click(screen.getByTestId('size-option-m'));

      // Add to cart
      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(mockAddToCart).toHaveBeenCalledWith({
        productId: '123',
        quantity: 1,
        name: 'Test T-Shirt',
        price: '27.00', // Size M price
        image: {
          url: 'test.jpg',
          altText: 'Test T-Shirt'
        },
        attributes: [{
          name: 'Size',
          value: 'M'
        }],
        variationId: 'var-2'
      });
    });

    it('should prevent add to cart for out of stock sizes', async () => {
      const user = userEvent.setup();
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      // Try to select out of stock size XL
      const sizeXL = screen.getByTestId('size-option-xl');
      expect(sizeXL).toBeDisabled();
    });

    it('should add simple products to cart without size selection', async () => {
      const user = userEvent.setup();
      mockAddToCart.mockResolvedValue(undefined);
      
      render(
        <ProductCard
          id="128"
          name="Simple Product"
          price="15.00"
          image="simple.jpg"
          slug="simple-product"
          type="SIMPLE"
          product={mockSimpleProduct}
          showSizeSelector={true}
        />
      );

      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(mockAddToCart).toHaveBeenCalledWith({
        productId: '128',
        quantity: 1,
        name: 'Simple Product',
        price: '15.00',
        image: {
          url: 'simple.jpg',
          altText: 'Simple Product'
        },
        attributes: undefined,
        variationId: undefined
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when trying to add unavailable size to cart', async () => {
      const user = userEvent.setup();
      
      // Mock a product where size validation fails
      const mockProductWithUnavailableSize = {
        ...mockProductWithSizes,
        variations: {
          nodes: [
            {
              ...mockProductWithSizes.variations!.nodes[0],
              stockStatus: 'OUT_OF_STOCK',
              stockQuantity: 0
            }
          ]
        }
      };
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithUnavailableSize}
          showSizeSelector={true}
          defaultSize="S"
        />
      );

      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(mockAddToCart).not.toHaveBeenCalled();
      expect(screen.getByText('Selected size is not available')).toBeInTheDocument();
    });

    it('should clear size error when size is changed', async () => {
      const user = userEvent.setup();
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      // Try to add to cart without size selection
      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(screen.getByText('Please select a size')).toBeInTheDocument();

      // Select a size
      await user.click(screen.getByTestId('size-option-m'));

      // Error should be cleared
      expect(screen.queryByText('Please select a size')).not.toBeInTheDocument();
    });
  });

  describe('Wishlist Integration', () => {
    it('should add to wishlist with current price (size-specific)', async () => {
      const user = userEvent.setup();
      
      render(
        <ProductCard
          id="123"
          name="Test T-Shirt"
          price="25.00"
          image="test.jpg"
          slug="test-t-shirt"
          type="VARIABLE"
          product={mockProductWithSizes}
          showSizeSelector={true}
        />
      );

      // Select size M (price: 27.00)
      await user.click(screen.getByTestId('size-option-m'));

      // Add to wishlist
      const wishlistButton = screen.getByLabelText('Add to wishlist');
      await user.click(wishlistButton);

      expect(mockAddToWishlist).toHaveBeenCalledWith({
        id: '123',
        name: 'Test T-Shirt',
        price: '27.00', // Size M price
        image: 'test.jpg',
        handle: 'test-t-shirt',
        material: 'Material not specified',
        variantId: '123'
      });
    });
  });
});