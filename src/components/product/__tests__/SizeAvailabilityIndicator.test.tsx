/**
 * Unit tests for SizeAvailabilityIndicator component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SizeAvailabilityIndicator from '../SizeAvailabilityIndicator';
import { SizeAttribute } from '@/lib/sizeAttributeProcessor';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock size attributes
const mockSizeInStock: SizeAttribute = {
  name: 'Size',
  value: 'M',
  slug: 'm',
  isAvailable: true,
  stockQuantity: 10
};

const mockSizeLowStock: SizeAttribute = {
  name: 'Size',
  value: 'L',
  slug: 'l',
  isAvailable: true,
  stockQuantity: 3
};

const mockSizeOutOfStock: SizeAttribute = {
  name: 'Size',
  value: 'XL',
  slug: 'xl',
  isAvailable: false,
  stockQuantity: 0
};

describe('SizeAvailabilityIndicator', () => {
  describe('Stock Status Detection', () => {
    it('should detect in stock status', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'in_stock');
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });

    it('should detect low stock status', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeLowStock}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'low_stock');
      expect(screen.getByText('Only 3 left')).toBeInTheDocument();
    });

    it('should detect out of stock status', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeOutOfStock}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'out_of_stock');
      expect(screen.getByText('Out of stock')).toBeInTheDocument();
    });

    it('should use explicit stock status over size attribute', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          stockStatus="on_backorder"
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'on_backorder');
      expect(screen.getByText('On Backorder')).toBeInTheDocument();
    });

    it('should use explicit stock quantity', () => {
      render(
        <SizeAvailabilityIndicator
          stockQuantity={2}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'low_stock');
      expect(screen.getByText('Only 2 left')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render badge variant by default', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
        />
      );

      const badge = screen.getByText('In Stock');
      expect(badge.closest('div')).toHaveClass('inline-flex', 'items-center', 'px-2', 'py-1', 'rounded-full');
    });

    it('should render dot variant', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          variant="dot"
        />
      );

      const dot = screen.getByTestId('size-availability-indicator').querySelector('.w-2.h-2.rounded-full');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('bg-green-500');
    });

    it('should render text variant', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          variant="text"
        />
      );

      const text = screen.getByText('In Stock');
      expect(text).toHaveClass('text-xs', 'font-medium', 'text-green-600');
    });

    it('should render detailed variant', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeLowStock}
          variant="detailed"
          lastUpdated="2023-12-01T10:00:00Z"
        />
      );

      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Only 3 left')).toBeInTheDocument();
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });
  });

  describe('Quantity Display', () => {
    it('should show quantity by default', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeLowStock}
        />
      );

      expect(screen.getByText('Only 3 left')).toBeInTheDocument();
    });

    it('should hide quantity when showQuantity is false', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeLowStock}
          showQuantity={false}
        />
      );

      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.queryByText('Only 3 left')).not.toBeInTheDocument();
    });

    it('should show "In stock" for high quantities', () => {
      render(
        <SizeAvailabilityIndicator
          stockQuantity={50}
        />
      );

      expect(screen.getByText('In stock')).toBeInTheDocument();
    });

    it('should show specific quantity for medium quantities', () => {
      render(
        <SizeAvailabilityIndicator
          stockQuantity={8}
        />
      );

      expect(screen.getByText('8 available')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          showTooltip={true}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByText(/Size M • In Stock/)).toBeInTheDocument();
      });
    });

    it('should hide tooltip when showTooltip is false', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          showTooltip={false}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.queryByText(/Size M • In Stock/)).not.toBeInTheDocument();
      });
    });

    it('should show tooltip with last updated time', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          lastUpdated="2023-12-01T10:30:00Z"
          showTooltip={true}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByText(/Updated:/)).toBeInTheDocument();
      });
    });

    it('should not show tooltip for detailed variant', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          variant="detailed"
          showTooltip={true}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      
      await user.hover(indicator);

      // Wait a bit to ensure tooltip doesn't appear
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(screen.queryByText(/Size M • In Stock/)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when updating', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          isUpdating={true}
        />
      );

      // Check for loading spinner (Loader2 icon)
      const spinner = screen.getByTestId('size-availability-indicator').querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show updating text in detailed variant', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          variant="detailed"
          isUpdating={true}
        />
      );

      expect(screen.getByText('Updating stock...')).toBeInTheDocument();
    });

    it('should show pulsing animation for dot variant when updating', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          variant="dot"
          isUpdating={true}
        />
      );

      const pulsingElement = screen.getByTestId('size-availability-indicator').querySelector('.animate-ping');
      expect(pulsingElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      expect(indicator).toHaveAttribute('aria-label', 'Size M • In Stock');
    });

    it('should be focusable when tooltip is enabled', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          showTooltip={true}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      expect(indicator).toHaveAttribute('tabIndex', '0');
      expect(indicator).toHaveAttribute('role', 'button');
    });

    it('should not be focusable when tooltip is disabled', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          showTooltip={false}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      expect(indicator).toHaveAttribute('tabIndex', '-1');
      expect(indicator).not.toHaveAttribute('role');
    });

    it('should show tooltip on focus', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          showTooltip={true}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator').firstChild as HTMLElement;
      
      await user.tab(); // Focus the indicator
      
      await waitFor(() => {
        expect(screen.getByText(/Size M • In Stock/)).toBeInTheDocument();
      });
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          className="custom-class"
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveClass('custom-class');
    });

    it('should apply custom test id', () => {
      render(
        <SizeAvailabilityIndicator
          size={mockSizeInStock}
          data-testid="custom-indicator"
        />
      );

      expect(screen.getByTestId('custom-indicator')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown stock status', () => {
      render(
        <SizeAvailabilityIndicator
          stockStatus="unknown"
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'unknown');
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle missing size and stock data', () => {
      render(
        <SizeAvailabilityIndicator />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'unknown');
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle zero stock quantity', () => {
      render(
        <SizeAvailabilityIndicator
          stockQuantity={0}
        />
      );

      const indicator = screen.getByTestId('size-availability-indicator');
      expect(indicator).toHaveAttribute('data-stock-status', 'out_of_stock');
      expect(screen.getByText('Out of stock')).toBeInTheDocument();
    });
  });
});