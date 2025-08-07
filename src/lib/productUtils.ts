import { addInventoryMapping } from '@/lib/inventoryMapping';

/**
 * Utility functions for working with product data
 */

/**
 * Process product data to set up inventory-to-product mappings
 * This helps with more efficient inventory updates via webhooks
 * @param product The product data from Shopify
 */
export function processProductInventoryMappings(product: any) {
  if (!product) return;

  try {
    // Check product structure
    if (!product.variants) return;
    
    // Create batch for more efficient updating of Redis
    const mappings: Array<{ inventoryItemId: string; productHandle: string }> = [];
    
    // Handle different API response formats
    if (Array.isArray(product.variants)) {
      // Direct array of variants
      product.variants.forEach((variant: any) => {
        if (variant.inventory_item_id) {
          const inventoryItemId = variant.inventory_item_id.toString();
          // Update in-memory cache immediately for faster access
          addInventoryMapping(inventoryItemId, product.handle);
          // Add to batch for Redis
          mappings.push({ inventoryItemId, productHandle: product.handle });
        }
      });
    } else if (product.variants.edges) {
      // GraphQL edge format
      product.variants.edges.forEach((edge: any) => {
        if (edge.node?.inventory_item_id) {
          const inventoryItemId = edge.node.inventory_item_id.toString();
          // Update in-memory cache immediately for faster access
          addInventoryMapping(inventoryItemId, product.handle);
          // Add to batch for Redis
          mappings.push({ inventoryItemId, productHandle: product.handle });
        }
      });
    } else if (product.variants.nodes) {
      // Modern GraphQL node format
      product.variants.nodes.forEach((node: any) => {
        if (node?.inventory_item_id) {
          const inventoryItemId = node.inventory_item_id.toString();
          // Update in-memory cache immediately for faster access
          addInventoryMapping(inventoryItemId, product.handle);
          // Add to batch for Redis
          mappings.push({ inventoryItemId, productHandle: product.handle });
        }
      });
    }
    
    // If we have inventory items to map, batch update them in persistent storage
    if (mappings.length > 0) {
      // We don't await this - it's a background operation
      import('@/lib/inventoryMapping').then(({ updateInventoryMappings }) => {
        updateInventoryMappings(mappings).catch(error => {
          console.error('Error batch updating inventory mappings:', error);
        });
      });
    }
    
    console.log(`Processed ${mappings.length} inventory mappings for product: ${product.handle}`);
  } catch (error) {
    console.error('Error processing product inventory mappings:', error);
  }
}

/**
 * Extract inventory information from a product variant
 * @param variant The product variant
 */
export function getVariantInventoryInfo(variant: any) {
  if (!variant) return { available: false, quantity: 0 };
  
  // Check if the variant is available for sale
  const available = variant.availableForSale || false;
  
  // Get the quantity available (may be null if not tracked)
  let quantity = 0;
  
  if (variant.quantityAvailable !== undefined && variant.quantityAvailable !== null) {
    quantity = variant.quantityAvailable;
  } else if (variant.inventoryQuantity !== undefined && variant.inventoryQuantity !== null) {
    quantity = variant.inventoryQuantity;
  }
  
  return { available, quantity };
}

/**
 * Determine if a product has low inventory
 * @param variant The product variant
 * @param threshold The threshold for low inventory (default: 5)
 */
export function hasLowInventory(variant: any, threshold = 5) {
  const { available, quantity } = getVariantInventoryInfo(variant);
  return available && quantity > 0 && quantity <= threshold;
}

/**
 * Format a price for display
 * @param amount The price amount as a string or number
 * @param currencyCode The currency code (default: INR for Indian Rupees)
 */
export function formatPrice(amount: string | number, currencyCode = 'INR') {
  if (!amount) return '';

  // Convert string to number if needed
  const price = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Handle invalid prices (NaN, negative, etc.)
  if (isNaN(price) || price < 0) {
    return '';
  }

  // Return formatted price based on currency
  switch (currencyCode) {
    case 'INR':
      return `₹${price.toFixed(2)}`;
    case 'USD':
      return `$${price.toFixed(2)}`;
    case 'EUR':
      return `€${price.toFixed(2)}`;
    case 'GBP':
      return `£${price.toFixed(2)}`;
    default:
      return `${price.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * Safe price formatting that always returns a valid price string
 * @param amount The price amount as a string or number
 * @param currencyCode The currency code (default: INR for Indian Rupees)
 * @param fallback The fallback price to show if amount is invalid (default: '0.00')
 */
export function formatPriceSafe(amount: string | number, currencyCode = 'INR', fallback = '0.00') {
  const formatted = formatPrice(amount, currencyCode);
  if (formatted) return formatted;

  // Return fallback with currency symbol
  switch (currencyCode) {
    case 'INR':
      return `₹${fallback}`;
    case 'USD':
      return `$${fallback}`;
    case 'EUR':
      return `€${fallback}`;
    case 'GBP':
      return `£${fallback}`;
    default:
      return `${fallback} ${currencyCode}`;
  }
}

/**
 * Get currency symbol from currency code
 * @param currencyCode The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currencyCode = 'INR') {
  switch (currencyCode) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return currencyCode;
  }
} 