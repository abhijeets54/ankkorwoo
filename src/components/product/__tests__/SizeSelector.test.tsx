/**
 * Unit tests for SizeSelector component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SizeSelector from '../SizeSelector';
import { SizeAttribute } from '@/lib/sizeAttributeProcessor';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock size attributes
const mockSizes: SizeAttribute[] = [
  {
    name: 'Size',
    value: 'S',
    slug: 's',
    isAvailable: true,
    stockQuantity: 10
  },
  {
    name: 'Size',
    value: 'M',
    slug: 'm',
    isAvailable: true,
    stockQuantity: 5
  },
  {
    name: 'Size',
    value: 'L',
    slug: 'l',
    isAvailable: true,
    stockQuantity: 2
  },
  {
    name: 'Size',
    value: 'XL',
    slug: 'xl',
    isAvailable: false,
    stockQuantity: 0
  }
];

const mockSizesOutOfStock: SizeAttribute[] = [
  {
    name: 'Size',
    value: 'S',
    slug: 's',
    isAvailable: false,
    stockQuantity: 0
  },
  {
    name: 'Size',
    value: 'M',
    slug: 'm',
    isAvailable: false,
    stockQuantity: 0
  }
];

describe('SizeSelector', () => {
  const mockOnSizeChange = jest.fn();

  beforeEach(() => {
    mockOnSizeChange.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render all size options', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
        />
      );

      expect(screen.getByTestId('size-option-s')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-m')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-l')).toBeInTheDocument();
      expect(screen.getByTestId('size-option-xl')).toBeInTheDocument();
    });

    it('should display formatted size values', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
        />
      );

      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
      expect(screen.getByText('XL')).toBeInTheDocument();
    });

    it('should show empty state when no sizes provided', () => {
      render(
        <SizeSelector
          sizes={[]}
          onSizeChange={mockOnSizeChange}
        />
      );

      expect(screen.getByTestId('size-selector-empty')).toBeInTheDocument();
      expect(screen.getByText('No sizes available')).toBeInTheDocument();
    });
  });

  describe('Size Selection', () => {
    it('should call onSizeChange when available size is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
        />
      );

      await user.click(screen.getByTestId('size-option-m'));

      expect(mockOnSizeChange).toHaveBeenCalledWith('M');
    });

    it('should not call onSizeChange when unavailable size is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
        />
      );

      await user.click(screen.getByTestId('size-option-xl'));

      expect(mockOnSizeChange).not.toHaveBeenCalled();
    });

    it('should show selected size', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          selectedSize="M"
          onSizeChange={mockOnSizeChange}
        />
      );

      const selectedOption = screen.getByTestId('size-option-m');
      expect(selectedOption).toHaveAttribute('aria-pressed', 'true');
    });

    it('should not allow selection when disabled', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          disabled={true}
        />
      );

      await user.click(screen.getByTestId('size-option-s'));

      expect(mockOnSizeChange).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should render compact variant', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          variant="compact"
        />
      );

      const sizeOption = screen.getByTestId('size-option-s');
      expect(sizeOption).toHaveClass('px-3', 'py-2', 'text-sm');
    });

    it('should render full variant with header', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          variant="full"
        />
      );

      expect(screen.getByText('Select size')).toBeInTheDocument();
      expect(screen.getByText('3 sizes available')).toBeInTheDocument();
    });

    it('should render inline variant', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          variant="inline"
        />
      );

      const sizeOption = screen.getByTestId('size-option-s');
      expect(sizeOption).toHaveClass('px-2', 'py-1', 'text-xs');
    });
  });

  describe('Availability Display', () => {
    it('should show availability count in full variant', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          variant="full"
          showAvailability={true}
        />
      );

      expect(screen.getByText('3 sizes available')).toBeInTheDocument();
    });

    it('should show out of stock message when all sizes unavailable', () => {
      render(
        <SizeSelector
          sizes={mockSizesOutOfStock}
          onSizeChange={mockOnSizeChange}
          variant="full"
          showAvailability={true}
        />
      );

      expect(screen.getByText('Out of stock')).toBeInTheDocument();
      expect(screen.getByText('All sizes are currently out of stock')).toBeInTheDocument();
    });

    it('should disable unavailable size options', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
        />
      );

      const unavailableOption = screen.getByTestId('size-option-xl');
      expect(unavailableOption).toBeDisabled();
      expect(unavailableOption).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          aria-label="Choose your size"
        />
      );

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-label', 'Choose your size');
      expect(radioGroup).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper button labels', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          selectedSize="M"
          onSizeChange={mockOnSizeChange}
        />
      );

      expect(screen.getByLabelText('Size S')).toBeInTheDocument();
      expect(screen.getByLabelText('Size M (selected)')).toBeInTheDocument();
      expect(screen.getByLabelText('Size XL (out of stock)')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
        />
      );

      const firstOption = screen.getByTestId('size-option-s');
      firstOption.focus();

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('size-option-m')).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('size-option-l')).toHaveFocus();

      // Skip unavailable option
      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('size-option-s')).toHaveFocus(); // Should wrap around

      // Select with Enter
      await user.keyboard('{Enter}');
      expect(mockOnSizeChange).toHaveBeenCalledWith('S');
    });

    it('should support space key for selection', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
        />
      );

      const firstOption = screen.getByTestId('size-option-s');
      firstOption.focus();

      await user.keyboard(' ');
      expect(mockOnSizeChange).toHaveBeenCalledWith('S');
    });
  });

  describe('Status Messages', () => {
    it('should show selection prompt when no size selected', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          variant="full"
        />
      );

      expect(screen.getByText('Please select a size')).toBeInTheDocument();
    });

    it('should show confirmation when size is selected', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          selectedSize="M"
          onSizeChange={mockOnSizeChange}
          variant="full"
        />
      );

      expect(screen.getByText('Size M selected')).toBeInTheDocument();
    });

    it('should show selected size in header', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          selectedSize="L"
          onSizeChange={mockOnSizeChange}
          variant="full"
          aria-label="Size"
        />
      );

      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('(L)')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          className="custom-class"
        />
      );

      const container = screen.getByTestId('size-selector');
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should apply custom test id', () => {
      render(
        <SizeSelector
          sizes={mockSizes}
          onSizeChange={mockOnSizeChange}
          data-testid="custom-size-selector"
        />
      );

      expect(screen.getByTestId('custom-size-selector')).toBeInTheDocument();
    });
  });

  describe('Pricing Display', () => {
    const sizesWithPricing: SizeAttribute[] = [
      {
        name: 'Size',
        value: 'S',
        slug: 's',
        isAvailable: true,
        priceModifier: 0
      },
      {
        name: 'Size',
        value: 'L',
        slug: 'l',
        isAvailable: true,
        priceModifier: 5
      }
    ];

    it('should show price modifiers when enabled', async () => {
      const user = userEvent.setup();
      
      render(
        <SizeSelector
          sizes={sizesWithPricing}
          onSizeChange={mockOnSizeChange}
          showPricing={true}
        />
      );

      // Hover over size with price modifier to see tooltip
      await user.hover(screen.getByTestId('size-option-l'));

      await waitFor(() => {
        expect(screen.getByText('+$5')).toBeInTheDocument();
      });
    });
  });
});