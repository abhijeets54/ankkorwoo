'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Package, 
  Info,
  Loader2
} from 'lucide-react';
import { SizeAttribute } from '@/lib/sizeAttributeProcessor';

// Stock status types
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_backorder' | 'unknown';

// Indicator variant types
export type IndicatorVariant = 'badge' | 'dot' | 'text' | 'detailed';

// Component props interface
export interface SizeAvailabilityIndicatorProps {
  size?: SizeAttribute;
  stockStatus?: StockStatus;
  stockQuantity?: number;
  variant?: IndicatorVariant;
  showQuantity?: boolean;
  showTooltip?: boolean;
  isUpdating?: boolean;
  lastUpdated?: string;
  className?: string;
  'data-testid'?: string;
}

// Stock status configuration
const stockStatusConfig = {
  in_stock: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    label: 'In Stock',
    dotColor: 'bg-green-500'
  },
  low_stock: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
    label: 'Low Stock',
    dotColor: 'bg-orange-500'
  },
  out_of_stock: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    label: 'Out of Stock',
    dotColor: 'bg-red-500'
  },
  on_backorder: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    label: 'On Backorder',
    dotColor: 'bg-blue-500'
  },
  unknown: {
    icon: Info,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    label: 'Unknown',
    dotColor: 'bg-gray-500'
  }
};

/**
 * Determine stock status from size attribute or explicit values
 */
const determineStockStatus = (
  size?: SizeAttribute,
  stockStatus?: StockStatus,
  stockQuantity?: number
): StockStatus => {
  // Use explicit stock status if provided
  if (stockStatus) {
    return stockStatus;
  }

  // Determine from size attribute
  if (size) {
    if (!size.isAvailable) {
      return 'out_of_stock';
    }
    
    if (size.stockQuantity !== undefined) {
      if (size.stockQuantity === 0) {
        return 'out_of_stock';
      } else if (size.stockQuantity <= 5) {
        return 'low_stock';
      } else {
        return 'in_stock';
      }
    }
    
    return size.isAvailable ? 'in_stock' : 'out_of_stock';
  }

  // Determine from explicit stock quantity
  if (stockQuantity !== undefined) {
    if (stockQuantity === 0) {
      return 'out_of_stock';
    } else if (stockQuantity <= 5) {
      return 'low_stock';
    } else {
      return 'in_stock';
    }
  }

  return 'unknown';
};

/**
 * Get quantity display text
 */
const getQuantityText = (stockQuantity?: number, stockStatus?: StockStatus): string => {
  if (stockQuantity === undefined) {
    return '';
  }

  if (stockQuantity === 0) {
    return 'Out of stock';
  }

  if (stockQuantity <= 5) {
    return `Only ${stockQuantity} left`;
  }

  if (stockQuantity <= 10) {
    return `${stockQuantity} available`;
  }

  return 'In stock';
};

/**
 * Badge Variant Component
 */
const BadgeIndicator: React.FC<{
  status: StockStatus;
  config: typeof stockStatusConfig[StockStatus];
  showQuantity: boolean;
  stockQuantity?: number;
  isUpdating: boolean;
}> = ({ status, config, showQuantity, stockQuantity, isUpdating }) => {
  const Icon = config.icon;
  const quantityText = getQuantityText(stockQuantity, status);

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${config.color} ${config.bgColor} ${config.borderColor}`}>
      {isUpdating ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      <span>
        {showQuantity && quantityText ? quantityText : config.label}
      </span>
    </div>
  );
};

/**
 * Dot Variant Component
 */
const DotIndicator: React.FC<{
  status: StockStatus;
  config: typeof stockStatusConfig[StockStatus];
  isUpdating: boolean;
}> = ({ status, config, isUpdating }) => {
  return (
    <div className="relative">
      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      {isUpdating && (
        <div className="absolute inset-0 w-2 h-2 rounded-full border border-gray-400 animate-ping" />
      )}
    </div>
  );
};

/**
 * Text Variant Component
 */
const TextIndicator: React.FC<{
  status: StockStatus;
  config: typeof stockStatusConfig[StockStatus];
  showQuantity: boolean;
  stockQuantity?: number;
  isUpdating: boolean;
}> = ({ status, config, showQuantity, stockQuantity, isUpdating }) => {
  const quantityText = getQuantityText(stockQuantity, status);

  return (
    <span className={`text-xs font-medium ${config.color} flex items-center gap-1`}>
      {isUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
      {showQuantity && quantityText ? quantityText : config.label}
    </span>
  );
};

/**
 * Detailed Variant Component
 */
const DetailedIndicator: React.FC<{
  status: StockStatus;
  config: typeof stockStatusConfig[StockStatus];
  stockQuantity?: number;
  lastUpdated?: string;
  isUpdating: boolean;
}> = ({ status, config, stockQuantity, lastUpdated, isUpdating }) => {
  const Icon = config.icon;
  const quantityText = getQuantityText(stockQuantity, status);

  return (
    <div className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
      <div className="flex items-center gap-2 mb-1">
        {isUpdating ? (
          <Loader2 className={`w-4 h-4 animate-spin ${config.color}`} />
        ) : (
          <Icon className={`w-4 h-4 ${config.color}`} />
        )}
        <span className={`font-medium text-sm ${config.color}`}>
          {config.label}
        </span>
      </div>
      
      {quantityText && (
        <p className="text-xs text-gray-600 mb-1">{quantityText}</p>
      )}
      
      {lastUpdated && (
        <p className="text-xs text-gray-500">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
      
      {isUpdating && (
        <p className="text-xs text-gray-500 mt-1">Updating stock...</p>
      )}
    </div>
  );
};

/**
 * Size Availability Indicator Component
 * 
 * Displays stock status and availability information for product sizes
 * with multiple display variants and real-time update support.
 */
const SizeAvailabilityIndicator: React.FC<SizeAvailabilityIndicatorProps> = ({
  size,
  stockStatus,
  stockQuantity,
  variant = 'badge',
  showQuantity = true,
  showTooltip = true,
  isUpdating = false,
  lastUpdated,
  className = '',
  'data-testid': testId = 'size-availability-indicator'
}) => {
  const [showTooltipState, setShowTooltipState] = useState(false);

  // Determine the actual stock status
  const actualStockStatus = determineStockStatus(size, stockStatus, stockQuantity);
  const actualStockQuantity = stockQuantity ?? size?.stockQuantity;
  
  // Get configuration for the stock status
  const config = stockStatusConfig[actualStockStatus];

  // Create tooltip content
  const getTooltipContent = () => {
    const parts = [];
    
    if (size?.value) {
      parts.push(`Size ${size.value}`);
    }
    
    parts.push(config.label);
    
    if (showQuantity && actualStockQuantity !== undefined) {
      const quantityText = getQuantityText(actualStockQuantity, actualStockStatus);
      if (quantityText) {
        parts.push(quantityText);
      }
    }
    
    if (lastUpdated) {
      parts.push(`Updated: ${new Date(lastUpdated).toLocaleTimeString()}`);
    }
    
    return parts.join(' • ');
  };

  // Render the appropriate variant
  const renderIndicator = () => {
    switch (variant) {
      case 'dot':
        return (
          <DotIndicator
            status={actualStockStatus}
            config={config}
            isUpdating={isUpdating}
          />
        );
      
      case 'text':
        return (
          <TextIndicator
            status={actualStockStatus}
            config={config}
            showQuantity={showQuantity}
            stockQuantity={actualStockQuantity}
            isUpdating={isUpdating}
          />
        );
      
      case 'detailed':
        return (
          <DetailedIndicator
            status={actualStockStatus}
            config={config}
            stockQuantity={actualStockQuantity}
            lastUpdated={lastUpdated}
            isUpdating={isUpdating}
          />
        );
      
      case 'badge':
      default:
        return (
          <BadgeIndicator
            status={actualStockStatus}
            config={config}
            showQuantity={showQuantity}
            stockQuantity={actualStockQuantity}
            isUpdating={isUpdating}
          />
        );
    }
  };

  const tooltipContent = getTooltipContent();

  return (
    <div 
      className={`relative inline-block ${className}`}
      data-testid={testId}
      data-stock-status={actualStockStatus}
    >
      <div
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
        onFocus={() => showTooltip && setShowTooltipState(true)}
        onBlur={() => setShowTooltipState(false)}
        tabIndex={showTooltip ? 0 : -1}
        role={showTooltip ? 'button' : undefined}
        aria-label={tooltipContent}
      >
        {renderIndicator()}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && showTooltipState && variant !== 'detailed' && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#2c2c27] text-[#f4f3f0] text-xs rounded-lg whitespace-nowrap z-20 shadow-lg"
          >
            {tooltipContent}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#2c2c27]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SizeAvailabilityIndicator;