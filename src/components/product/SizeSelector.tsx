'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Info } from 'lucide-react';
import { SizeAttribute } from '@/lib/sizeAttributeProcessor';
import { sizeUtils } from '@/lib/sizeAttributeProcessor';

// Size selector display variants
export type SizeSelectorVariant = 'compact' | 'full' | 'inline';

// Size selector props interface
export interface SizeSelectorProps {
  sizes: SizeAttribute[];
  selectedSize?: string;
  onSizeChange: (size: string) => void;
  variant?: SizeSelectorVariant;
  disabled?: boolean;
  showAvailability?: boolean;
  showPricing?: boolean;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

// Individual size option props
interface SizeOptionProps {
  size: SizeAttribute;
  isSelected: boolean;
  onClick: () => void;
  variant: SizeSelectorVariant;
  disabled: boolean;
  showAvailability: boolean;
  showPricing: boolean;
}

/**
 * Individual Size Option Component
 */
const SizeOption: React.FC<SizeOptionProps> = ({
  size,
  isSelected,
  onClick,
  variant,
  disabled,
  showAvailability,
  showPricing
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isUnavailable = !size.isAvailable;
  const isDisabled = disabled || isUnavailable;

  // Size option styling based on variant and state
  const getOptionClasses = () => {
    const baseClasses = 'relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2c2c27] focus:ring-offset-2';
    
    const variantClasses = {
      compact: 'px-3 py-2 text-sm min-w-[2.5rem] h-10',
      full: 'px-4 py-3 text-base min-w-[3rem] h-12',
      inline: 'px-2 py-1 text-xs min-w-[2rem] h-8'
    };

    const stateClasses = isSelected
      ? 'bg-[#2c2c27] text-[#f4f3f0] border-[#2c2c27]'
      : isDisabled
        ? 'bg-[#f5f5f0] text-[#8a8778] border-[#d5d0c3] cursor-not-allowed'
        : 'bg-white text-[#2c2c27] border-[#d5d0c3] hover:border-[#8a8778] hover:bg-[#f8f8f5]';

    return `${baseClasses} ${variantClasses[variant]} border ${stateClasses}`;
  };

  // Tooltip content for size information
  const getTooltipContent = () => {
    const parts = [];
    
    if (showAvailability) {
      if (isUnavailable) {
        parts.push('Out of stock');
      } else if (size.stockQuantity !== undefined && size.stockQuantity <= 5) {
        parts.push(`Only ${size.stockQuantity} left`);
      } else {
        parts.push('In stock');
      }
    }

    if (showPricing && size.priceModifier && size.priceModifier !== 0) {
      const modifier = size.priceModifier > 0 ? `+$${size.priceModifier}` : `-$${Math.abs(size.priceModifier)}`;
      parts.push(modifier);
    }

    return parts.join(' • ');
  };

  const tooltipContent = getTooltipContent();
  const displayValue = sizeUtils.formatSizeForDisplay(size.value);

  return (
    <div className="relative">
      <motion.button
        type="button"
        className={getOptionClasses()}
        onClick={onClick}
        disabled={isDisabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        aria-label={`Size ${displayValue}${isUnavailable ? ' (out of stock)' : ''}${isSelected ? ' (selected)' : ''}`}
        aria-pressed={isSelected}
        aria-disabled={isDisabled}
        data-size={size.value}
        data-testid={`size-option-${size.slug}`}
      >
        {/* Size value */}
        <span className="font-medium">{displayValue}</span>
        
        {/* Selected indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-[#2c2c27] rounded-full flex items-center justify-center"
          >
            <Check className="w-2.5 h-2.5 text-[#f4f3f0]" />
          </motion.div>
        )}

        {/* Unavailable indicator */}
        {isUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-0.5 bg-[#8a8778] transform rotate-45" />
          </div>
        )}

        {/* Low stock indicator */}
        {size.isAvailable && size.stockQuantity !== undefined && size.stockQuantity <= 5 && variant !== 'inline' && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && tooltipContent && variant !== 'inline' && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#2c2c27] text-[#f4f3f0] text-xs rounded whitespace-nowrap z-10"
          >
            {tooltipContent}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-[#2c2c27]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Size Selector Component
 * 
 * A reusable component for selecting product sizes with multiple display variants,
 * accessibility features, and real-time availability indicators.
 */
const SizeSelector: React.FC<SizeSelectorProps> = ({
  sizes,
  selectedSize,
  onSizeChange,
  variant = 'full',
  disabled = false,
  showAvailability = true,
  showPricing = false,
  className = '',
  'aria-label': ariaLabel = 'Select size',
  'data-testid': testId = 'size-selector'
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sort sizes for better UX
  const sortedSizes = sizeUtils.sortSizes([...sizes]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) return;

      const availableIndices = sortedSizes
        .map((size, index) => ({ size, index }))
        .filter(({ size }) => size.isAvailable && !disabled)
        .map(({ index }) => index);

      if (availableIndices.length === 0) return;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          const nextIndex = focusedIndex === -1 
            ? availableIndices[0]
            : availableIndices[availableIndices.indexOf(focusedIndex) + 1] || availableIndices[0];
          setFocusedIndex(nextIndex);
          optionRefs.current[nextIndex]?.focus();
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          const prevIndex = focusedIndex === -1
            ? availableIndices[availableIndices.length - 1]
            : availableIndices[availableIndices.indexOf(focusedIndex) - 1] || availableIndices[availableIndices.length - 1];
          setFocusedIndex(prevIndex);
          optionRefs.current[prevIndex]?.focus();
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && sortedSizes[focusedIndex]?.isAvailable) {
            onSizeChange(sortedSizes[focusedIndex].value);
          }
          break;

        case 'Escape':
          event.preventDefault();
          containerRef.current?.blur();
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, sortedSizes, onSizeChange, disabled]);

  // Handle size selection
  const handleSizeSelect = (size: SizeAttribute) => {
    if (!size.isAvailable || disabled) return;
    onSizeChange(size.value);
  };

  // Get container classes based on variant
  const getContainerClasses = () => {
    const baseClasses = 'flex flex-wrap gap-2';
    const variantClasses = {
      compact: 'gap-1',
      full: 'gap-2',
      inline: 'gap-1'
    };
    return `${baseClasses} ${variantClasses[variant]} ${className}`;
  };

  // Show message if no sizes available
  if (sortedSizes.length === 0) {
    return (
      <div className="text-[#8a8778] text-sm flex items-center gap-2" data-testid={`${testId}-empty`}>
        <Info className="w-4 h-4" />
        <span>No sizes available</span>
      </div>
    );
  }

  // Count available sizes
  const availableSizesCount = sortedSizes.filter(size => size.isAvailable).length;

  return (
    <div className="space-y-2" data-testid={testId}>
      {/* Size selector header (for full variant) */}
      {variant === 'full' && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#2c2c27]">
            {ariaLabel}
            {selectedSize && (
              <span className="ml-2 text-[#8a8778]">
                ({sizeUtils.formatSizeForDisplay(selectedSize)})
              </span>
            )}
          </label>
          {showAvailability && (
            <span className="text-xs text-[#8a8778]">
              {availableSizesCount === 0 
                ? 'Out of stock'
                : `${availableSizesCount} size${availableSizesCount !== 1 ? 's' : ''} available`
              }
            </span>
          )}
        </div>
      )}

      {/* Size options */}
      <div
        ref={containerRef}
        className={getContainerClasses()}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-required="true"
      >
        {sortedSizes.map((size, index) => (
          <SizeOption
            key={size.value}
            size={size}
            isSelected={selectedSize === size.value}
            onClick={() => handleSizeSelect(size)}
            variant={variant}
            disabled={disabled}
            showAvailability={showAvailability}
            showPricing={showPricing}
            ref={(el) => (optionRefs.current[index] = el)}
          />
        ))}
      </div>

      {/* Size selection status */}
      {variant === 'full' && (
        <div className="text-xs text-[#8a8778] space-y-1">
          {!selectedSize && availableSizesCount > 0 && (
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Please select a size</span>
            </div>
          )}
          
          {selectedSize && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-3 h-3" />
              <span>Size {sizeUtils.formatSizeForDisplay(selectedSize)} selected</span>
            </div>
          )}

          {availableSizesCount === 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-3 h-3" />
              <span>All sizes are currently out of stock</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SizeSelector;