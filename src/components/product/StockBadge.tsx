'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

/**
 * Stock Badge Component
 *
 * Displays real-time stock status from WooCommerce
 * Based on WooCommerce stock status values:
 * - IN_STOCK / instock: Product is in stock
 * - OUT_OF_STOCK / outofstock: Product is out of stock
 * - ON_BACKORDER / onbackorder: Product can be backordered
 *
 * @see https://woocommerce.github.io/code-reference/classes/WC-Product.html#method_get_stock_status
 */

export interface StockBadgeProps {
  stockStatus: string;
  stockQuantity?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showIcon?: boolean;
  lowStockThreshold?: number;
}

const StockBadge: React.FC<StockBadgeProps> = ({
  stockStatus,
  stockQuantity,
  className = '',
  variant = 'default',
  showIcon = true,
  lowStockThreshold = 5
}) => {
  // Normalize stock status (handle both uppercase and lowercase)
  const normalizedStatus = stockStatus?.toUpperCase();

  // Determine stock state
  const isInStock = normalizedStatus === 'IN_STOCK' || normalizedStatus === 'INSTOCK';
  const isOutOfStock = normalizedStatus === 'OUT_OF_STOCK' ||
                       normalizedStatus === 'OUTOFSTOCK' ||
                       stockQuantity === 0;
  const isOnBackorder = normalizedStatus === 'ON_BACKORDER' || normalizedStatus === 'ONBACKORDER';
  const isLowStock = isInStock &&
                     stockQuantity !== undefined &&
                     stockQuantity > 0 &&
                     stockQuantity <= lowStockThreshold;

  // Determine badge styling based on stock state
  const getBadgeConfig = () => {
    if (isOutOfStock) {
      return {
        icon: XCircle,
        text: 'Out of Stock',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500'
      };
    }

    if (isLowStock) {
      return {
        icon: AlertTriangle,
        text: `Only ${stockQuantity} left`,
        textColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-500'
      };
    }

    if (isOnBackorder) {
      return {
        icon: Clock,
        text: 'On Backorder',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-500'
      };
    }

    if (isInStock) {
      return {
        icon: CheckCircle,
        text: 'In Stock',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-500'
      };
    }

    // Unknown status
    return {
      icon: AlertTriangle,
      text: 'Status Unknown',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-500'
    };
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  // Variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'text-xs px-2 py-0.5 gap-1';
      case 'detailed':
        return 'text-sm px-3 py-1.5 gap-2';
      default:
        return 'text-xs px-2 py-1 gap-1.5';
    }
  };

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.textColor} ${config.bgColor}
        border ${config.borderColor}
        ${getVariantClasses()}
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label={`Stock status: ${config.text}`}
    >
      {showIcon && (
        <Icon
          className={`
            ${variant === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
            ${config.iconColor}
          `}
          aria-hidden="true"
        />
      )}
      <span>{config.text}</span>
    </div>
  );
};

export default StockBadge;
