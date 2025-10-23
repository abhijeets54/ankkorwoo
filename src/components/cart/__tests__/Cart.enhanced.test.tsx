/**
 * Unit tests for enhanced Cart component with size information display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Cart from '../Cart';
import { CartItem } from '@/lib/localCartStore';

// Mock dependencies
jest.mock('@/lib/localCartStore');
jest.mock('@/contexts/AuthContext');
jest.mock('@/components/cart/CartProvider');
jest.mock('@/lib/eventBus');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock cart items with size information
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

// Mock hooks
const mockRemoveCartItem = jest.fn();
const mockUpdateCartItem = jest.fn();
const mockClearCart = jest.fn();
const mockToggleCart = jest.fn();

jest.mock('@/lib/localCartStore', () => ({
  useLocalCartStore: () => ({
    items: [mockCartItemWithSize, mockCartItemWithoutSize, mockCartItemWithNumericSize],
    itemCount: 4, // 2 + 1 + 1
    removeCartItem: mockRemoveCartItem,
    updateCartItem: mockUpdateCartItem,
    clearCart: mockClearCart,
    error: null,
    setError: jest.fn(),
    subtotal: () => 140, // 50 + 15 + 80
  })
}));

jest.mock('@/components/cart/CartProvider', () => ({
  useCart: () => ({
    isOpen: true,
    toggleCart: mockToggleCart
  })
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com' },
    token: 'mock-token',
    isLoading: false
  })
}));

describe('Enhanced Cart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Size Information Display', () => {
    it('should display size information for items with sizes', () => {
      render(<Cart />);

      // Should show size badge on product image
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('Size 42')).toBeInTheDocument();

      // Should show size in product info
      expect(screen.getByText('Test T-Shirt')).toBeInTheDocument();
      expect(screen.getByText('Shoes')).toBeInTheDocument();
    });

    it('should not display size information for items without sizes', () => {
      render(<Cart />);

      // Simple product should not have size information
      expect(screen.getByText('Simple Product')).toBeInTheDocument();
      
      // Should not have size badge or size info for simple product
      const simpleProductContainer = screen.getByText('Simple Product').closest('li');
      expect(simpleProductContainer?.querySelector('.bg-\\[\\#2c2c27\\]')).toBeNull();
    });

    it('should display non-size attributes separately', () => {
      render(<Cart />);

      // Should show color attribute for the t-shirt
      expect(screen.getByText('Color: Red')).toBeInTheDocument();
    });

    it('should show item totals for multi-quantity items', () => {
      render(<Cart />);

      // T-shirt has quantity 2, so should show total
      expect(screen.getByText('each')).toBeInTheDocument();
      expect(screen.getByText('₹50.00')).toBeInTheDocument(); // 25 * 2
    });
  });

  describe('Cart Summary', () => {
    it('should show cart summary with size information', () => {
      render(<Cart />);

      expect(screen.getByText('Cart Summary')).toBeInTheDocument();
      expect(screen.getByText('4 items')).toBeInTheDocument();
      expect(screen.getByText('With sizes:')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument(); // T-shirt and shoes have sizes
    });

    it('should show correct subtotal and total', () => {
      render(<Cart />);

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('₹140.00')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  describe('Quantity Controls', () => {
    it('should handle quantity increment', async () => {
      const user = userEvent.setup();
      render(<Cart />);

      const incrementButton = screen.getAllByLabelText('Increase quantity')[0];
      await user.click(incrementButton);

      expect(mockUpdateCartItem).toHaveBeenCalledWith('item-1', 3);
    });

    it('should handle quantity decrement', async () => {
      const user = userEvent.setup();
      render(<Cart />);

      const decrementButton = screen.getAllByLabelText('Decrease quantity')[0];
      await user.click(decrementButton);

      expect(mockUpdateCartItem).toHaveBeenCalledWith('item-1', 1);
    });

    it('should disable decrement when quantity is 1', () => {
      render(<Cart />);

      // Simple product has quantity 1, so decrement should be disabled
      const decrementButtons = screen.getAllByLabelText('Decrease quantity');
      const simpleProductDecrement = decrementButtons.find(button => 
        button.closest('li')?.textContent?.includes('Simple Product')
      );
      
      expect(simpleProductDecrement).toBeDisabled();
    });
  });

  describe('Item Removal', () => {
    it('should handle item removal with proper aria label', async () => {
      const user = userEvent.setup();
      render(<Cart />);

      const removeButton = screen.getByLabelText('Remove Test T-Shirt from cart');
      await user.click(removeButton);

      expect(mockRemoveCartItem).toHaveBeenCalledWith('item-1');
    });

    it('should handle item removal for items with numeric sizes', async () => {
      const user = userEvent.setup();
      render(<Cart />);

      const removeButton = screen.getByLabelText('Remove Shoes - Size 42 from cart');
      await user.click(removeButton);

      expect(mockRemoveCartItem).toHaveBeenCalledWith('item-3');
    });
  });

  describe('Size Availability Indicators', () => {
    it('should show availability indicators for items with sizes and variations', () => {
      render(<Cart />);

      // Should show availability indicators for items with variationId
      const availabilityIndicators = screen.getAllByTestId('size-availability-indicator');
      expect(availabilityIndicators).toHaveLength(2); // T-shirt and shoes have variations
    });

    it('should not show availability indicators for simple products', () => {
      render(<Cart />);

      // Simple product should not have availability indicator
      const simpleProductContainer = screen.getByText('Simple Product').closest('li');
      expect(simpleProductContainer?.querySelector('[data-testid="size-availability-indicator"]')).toBeNull();
    });
  });

  describe('Enhanced UI Elements', () => {
    it('should show enhanced quantity controls with better styling', () => {
      render(<Cart />);

      // Should have rounded quantity controls
      const quantityControls = screen.getAllByText('2')[0].closest('.border-gray-300');
      expect(quantityControls).toHaveClass('rounded');
    });

    it('should show size badges on product images', () => {
      render(<Cart />);

      // Should have size badges positioned on images
      const sizeBadges = screen.getAllByText('M');
      expect(sizeBadges[0]).toHaveClass('bg-[#2c2c27]', 'text-[#f4f3f0]');
    });

    it('should show enhanced remove buttons with hover effects', () => {
      render(<Cart />);

      const removeButtons = screen.getAllByLabelText(/Remove .* from cart/);
      removeButtons.forEach(button => {
        expect(button).toHaveClass('hover:bg-red-50', 'hover:text-red-600');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for size-specific items', () => {
      render(<Cart />);

      expect(screen.getByLabelText('Remove Test T-Shirt from cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Shoes - Size 42 from cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Simple Product from cart')).toBeInTheDocument();
    });

    it('should have proper quantity control labels', () => {
      render(<Cart />);

      const incrementButtons = screen.getAllByLabelText('Increase quantity');
      const decrementButtons = screen.getAllByLabelText('Decrease quantity');

      expect(incrementButtons).toHaveLength(3);
      expect(decrementButtons).toHaveLength(3);
    });
  });

  describe('Empty Cart State', () => {
    it('should show empty cart message when no items', () => {
      // Mock empty cart
      jest.mocked(require('@/lib/localCartStore').useLocalCartStore).mockReturnValue({
        items: [],
        itemCount: 0,
        removeCartItem: mockRemoveCartItem,
        updateCartItem: mockUpdateCartItem,
        clearCart: mockClearCart,
        error: null,
        setError: jest.fn(),
        subtotal: () => 0,
      });

      render(<Cart />);

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByText('Looks like you haven\'t added any items yet.')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when there is an error', () => {
      // Mock error state
      jest.mocked(require('@/lib/localCartStore').useLocalCartStore).mockReturnValue({
        items: [],
        itemCount: 0,
        removeCartItem: mockRemoveCartItem,
        updateCartItem: mockUpdateCartItem,
        clearCart: mockClearCart,
        error: 'Failed to load cart',
        setError: jest.fn(),
        subtotal: () => 0,
      });

      render(<Cart />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Failed to load cart')).toBeInTheDocument();
    });
  });
});