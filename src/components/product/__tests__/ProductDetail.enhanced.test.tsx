/**
 * Unit tests for enhanced ProductDetail component with size selection
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductDetail from '../ProductDetail';

// Mock dependencies
jest.mock('@/lib/localCartStore');
jest.mock('@/components/cart/CartProvider');
jest.mock('@/hooks/useSimpleStockUpdates');
jest.mock('react-hot-toast');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock product data with sizes
const mockProductWithSizes = {
  id: 'product-1',
  databaseId: 123,
  name: 'Test T-Shirt',
  slug: 'test-t-shirt',
  description: '<p>A detailed description of the test t-shirt</p>',
  shortDescription: '<p>Test t-shirt</p>',
  type: 'VARIABLE',
  price: '25.00',
  regularPrice: '25.00',
  onSale: false,
  stockStatus: 'IN_STOCK',
  image: {
    sourceUrl: 'test.jpg',
    altText: 'Test'
  },
  galleryImages: {
    nodes: [
      { sourceUrl: 'test2.jpg', altText: 'Test 2' },
      { sourceUrl: 'test3.jpg', altText: 'Test 3' }
    ]
  },
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

const mockSimpleProduct = {
  id: 'product-2',
  databaseId: 128,
  name: 'Simple Product',
  slug: 'simple-product',
  description: '<p>A simple product description</p>',
  shortDescription: '<p>Simple product</p>',
  type: 'SIMPLE',
  price: '15.00',
  regularPrice: '15.00',
  onSale: false,
  stockStatus: 'IN_STOCK',
  image: {
    sourceUrl: 'simple.jpg',
    altText: 'Simple'
  },
  galleryImages: { nodes: [] }
};

// Mock hooks
const mockAddToCart = jest.fn();
const mockOpenCart = jest.fn();

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

jest.mock('@/hooks/useSimpleStockUpdates', () => ({
  useSimpleStockUpdates: () => ({
    stockStatus: 'IN_STOCK',
    stockQuantity: 10,
    isUpdating: false,
    lastUpdated: '2023-12-01T10:00:00Z'
  })
}));

describe('ProductDetail with Size Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Size Selector Display', () => {
    it('should show size selector for variable products with sizes', () => {
      render(<ProductDetail product={mockProductWithSizes} />);

      expect(screen.getByTestId('size-selector')).toBeInTheDocument();
      expect(screen.getByText('Select size')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-s')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-m')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-l')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-xl')).toBeInTheDocument();
    });

    it('should not show size selector for simple products', () => {
      render(<ProductDetail product={mockSimpleProduct} />);

      expect(screen.queryByTestId('size-selector')).not.toBeInTheDocument();
    });

    it('should show other attributes (non-size) separately', () => {
      render(<ProductDetail product={mockProductWithSizes} />);

      // Should show Color attribute separately from size
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
    });

    it('should show size guide information', () => {
      render(<ProductDetail product={mockProductWithSizes} />);

      expect(screen.getByText('Size Guide')).toBeInTheDocument();
      expect(screen.getByText(/Need help choosing the right size/)).toBeInTheDocument();
    });
  });

  describe('Size Selection and Pricing', () => {
    it('should update price when size is selected', async () => {
      const user = userEvent.setup();
      
      render(<ProductDetail product={mockProductWithSizes} />);

      // Initial price should be base price
      expect(screen.getByText('₹25.00')).toBeInTheDocument();

      // Select size M (price: 27.00)
      await user.click(screen.getByTestId('size-option-m'));

      await waitFor(() => {
        expect(screen.getByText('₹27.00')).toBeInTheDocument();
      });
    });

    it('should show size-specific availability when size is selected', async () => {
      const user = userEvent.setup();
      
      render(<ProductDetail product={mockProductWithSizes} />);

      // Select size L (low stock)
      await user.click(screen.getByTestId('size-option-l'));

      await waitFor(() => {
        expect(screen.getByText('Selected size availability:')).toBeInTheDocument();
        expect(screen.getByTestId('size-availability-indicator')).toBeInTheDocument();
      });
    });

    it('should set default size automatically', () => {
      render(<ProductDetail product={mockProductWithSizes} />);

      // Should auto-select first available size (S)
      const sizeS = screen.getByTestId('size-option-s');
      expect(sizeS).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Add to Cart with Size Validation', () => {
    it('should prevent add to cart without size selection', async () => {
      const user = userEvent.setup();
      
      // Mock product without default size selection
      const productWithoutDefault = {
        ...mockProductWithSizes,
        variations: {
          nodes: mockProductWithSizes.variations.nodes.map(v => ({
            ...v,
            stockStatus: 'OUT_OF_STOCK' // Make all sizes unavailable initially
          }))
        }
      };
      
      render(<ProductDetail product={productWithoutDefault} />);

      const addToCartButton = screen.getByText('Add to Cart');
      expect(addToCartButton).toBeDisabled();
      
      expect(screen.getByText('Please select a size to add this product to your cart')).toBeInTheDocument();
    });

    it('should add to cart with size information when size is selected', async () => {
      const user = userEvent.setup();
      mockAddToCart.mockResolvedValue(undefined);
      
      render(<ProductDetail product={mockProductWithSizes} />);

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
          altText: 'Test'
        },
        attributes: [{
          name: 'Size',
          value: 'M'
        }],
        variationId: 'var-2'
      });
    });

    it('should show error when trying to add unavailable size', async () => {
      const user = userEvent.setup();
      
      render(<ProductDetail product={mockProductWithSizes} />);

      // Try to select out of stock size XL
      const sizeXL = screen.getByTestId('size-option-xl');
      expect(sizeXL).toBeDisabled();
    });

    it('should add simple products to cart without size selection', async () => {
      const user = userEvent.setup();
      mockAddToCart.mockResolvedValue(undefined);
      
      render(<ProductDetail product={mockSimpleProduct} />);

      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(mockAddToCart).toHaveBeenCalledWith({
        productId: '128',
        quantity: 1,
        name: 'Simple Product',
        price: '15.00',
        image: {
          url: 'simple.jpg',
          altText: 'Simple'
        },
        attributes: undefined,
        variationId: undefined
      });
    });
  });

  describe('Quantity Selection', () => {
    it('should handle quantity changes', async () => {
      const user = userEvent.setup();
      
      render(<ProductDetail product={mockProductWithSizes} />);

      const incrementButton = screen.getByLabelText('Increase quantity');
      const decrementButton = screen.getByLabelText('Decrease quantity');

      // Initial quantity should be 1
      expect(screen.getByText('1')).toBeInTheDocument();

      // Increment quantity
      await user.click(incrementButton);
      expect(screen.getByText('2')).toBeInTheDocument();

      // Increment again
      await user.click(incrementButton);
      expect(screen.getByText('3')).toBeInTheDocument();

      // Decrement quantity
      await user.click(decrementButton);
      expect(screen.getByText('2')).toBeInTheDocument();

      // Decrement to 1
      await user.click(decrementButton);
      expect(screen.getByText('1')).toBeInTheDocument();

      // Should not go below 1
      expect(decrementButton).toBeDisabled();
    });

    it('should add correct quantity to cart', async () => {
      const user = userEvent.setup();
      mockAddToCart.mockResolvedValue(undefined);
      
      render(<ProductDetail product={mockProductWithSizes} />);

      // Select size and increase quantity
      await user.click(screen.getByTestId('size-option-m'));
      await user.click(screen.getByLabelText('Increase quantity'));
      await user.click(screen.getByLabelText('Increase quantity'));

      // Add to cart
      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(mockAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 3
        })
      );
    });
  });

  describe('Image Gallery', () => {
    it('should show main image and thumbnails', () => {
      render(<ProductDetail product={mockProductWithSizes} />);

      // Should show main image
      expect(screen.getByAltText('Test')).toBeInTheDocument();

      // Should show thumbnail images
      expect(screen.getByAltText('Test T-Shirt - Image 2')).toBeInTheDocument();
      expect(screen.getByAltText('Test T-Shirt - Image 3')).toBeInTheDocument();
    });

    it('should change main image when thumbnail is clicked', async () => {
      const user = userEvent.setup();
      
      render(<ProductDetail product={mockProductWithSizes} />);

      const thumbnail = screen.getByAltText('Test T-Shirt - Image 2');
      await user.click(thumbnail);

      // The thumbnail should now have the selected styling
      expect(thumbnail.closest('button')).toHaveClass('ring-2', 'ring-[#2c2c27]');
    });
  });

  describe('Error Handling', () => {
    it('should clear size error when size is selected', async () => {
      const user = userEvent.setup();
      
      // Create a product where no size is initially selected
      const productWithoutDefault = {
        ...mockProductWithSizes,
        variations: {
          nodes: mockProductWithSizes.variations.nodes.map((v, index) => ({
            ...v,
            stockStatus: index === 0 ? 'OUT_OF_STOCK' : 'IN_STOCK' // Make first size unavailable
          }))
        }
      };
      
      render(<ProductDetail product={productWithoutDefault} />);

      // Try to add to cart without size selection
      const addToCartButton = screen.getByText('Add to Cart');
      await user.click(addToCartButton);

      expect(screen.getByText('Please select a size')).toBeInTheDocument();

      // Select a size
      await user.click(screen.getByTestId('size-option-m'));

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Please select a size')).not.toBeInTheDocument();
      });
    });
  });

  describe('Stock Status Display', () => {
    it('should show stock status information', () => {
      render(<ProductDetail product={mockProductWithSizes} />);

      expect(screen.getByText('Availability:')).toBeInTheDocument();
      expect(screen.getByText('✓ In Stock')).toBeInTheDocument();
    });

    it('should show real-time stock updates', () => {
      render(<ProductDetail product={mockProductWithSizes} />);

      expect(screen.getByText(/Stock updated:/)).toBeInTheDocument();
    });
  });
});