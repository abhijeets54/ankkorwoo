'use client';

import React from 'react';
import { Package, Check } from 'lucide-react';
import { CartItem } from '@/lib/localCartStore';
import { CartSizeUtils } from '@/lib/cartSizeUtils';

interface CheckoutItemProps {
  item: CartItem;
  showSizeInfo?: boolean;
  showAvailability?: boolean;
  className?: string;
}

/**
 * Checkout Item Component
 * 
 * Displays cart items in checkout with size information and enhanced styling
 */
const CheckoutItem: React.FC<CheckoutItemProps> = ({
  item,
  showSizeInfo = true,
  showAvailability = true,
  className = ''
}) => {
  // Extract size and other attribute information
  const sizeInfo = CartSizeUtils.extractSizeFromCartItem(item);
  const displayName = CartSizeUtils.createCartItemDisplayName(item);
  const formattedItem = CartSizeUtils.formatCartItemForCheckout(item);

  // Calculate item total
  const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  const itemTotal = itemPrice * item.quantity;

  return (
    <div className={`flex gap-4 py-3 border-b border-gray-100 last:border-b-0 ${className}`}>
      {/* Product Image */}
      {item.image?.url && (
        <div className="relative h-16 w-16 bg-gray-100 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={item.image.url}
            alt={item.image.altText || item.name}
            className="h-full w-full object-cover"
          />
          
          {/* Size badge on image */}
          {showSizeInfo && sizeInfo.hasSize && (
            <div className="absolute -top-1 -right-1 bg-[#2c2c27] text-[#f4f3f0] text-xs px-1.5 py-0.5 rounded-full font-medium">
              {sizeInfo.displayName}
            </div>
          )}
          
          {/* Quantity indicator */}
          {item.quantity > 1 && (
            <div className="absolute -bottom-1 -left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
              {item.quantity}
            </div>
          )}
        </div>
      )}

      {/* Product Information */}
      <div className="flex-1 min-w-0">
        {/* Product Name */}
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {item.name}
        </h3>
        
        {/* Size Information */}
        {showSizeInfo && sizeInfo.hasSize && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs text-[#2c2c27] bg-[#f8f8f5] px-2 py-1 rounded-full">
              <Package className="h-3 w-3" />
              <span className="font-medium">{sizeInfo.displayName}</span>
            </div>
            
            {showAvailability && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" />
                <span>Available</span>
              </div>
            )}
          </div>
        )}
        
        {/* Other Attributes */}
        {formattedItem.attributes.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {formattedItem.attributes
              .filter(attr => !attr.startsWith('Size:'))
              .join(', ')}
          </div>
        )}
        
        {/* Price and Quantity */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-gray-600">
            ₹{itemPrice.toFixed(2)}
            {item.quantity > 1 && (
              <span className="text-xs ml-1">× {item.quantity}</span>
            )}
          </div>
          
          {/* Item Status */}
          <div className="flex items-center gap-2">
            {sizeInfo.hasSize && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Size: {sizeInfo.displayName}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Total */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium text-gray-900">
          ₹{itemTotal.toFixed(2)}
        </div>
        {item.quantity > 1 && (
          <div className="text-xs text-gray-500">
            {item.quantity} {item.quantity === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutItem;