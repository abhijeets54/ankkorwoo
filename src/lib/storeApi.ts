/**
 * WooCommerce Store API Service
 * 
 * This module provides functions to interact with the WooCommerce Store API
 * for cart management and checkout processing.
 */

import { cartSession } from './cartSession';
import { withRetry, isRetryableApiError } from './withRetry';

// Base URL for WooCommerce Store API
const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

// Store API endpoints
const ENDPOINTS = {
  CART: '/wp-json/wc/store/v1/cart',
  CART_ITEMS: '/wp-json/wc/store/v1/cart/items',
  ADD_ITEM: '/wp-json/wc/store/v1/cart/add-item',
  UPDATE_ITEM: '/wp-json/wc/store/v1/cart/update-item',
  CHECKOUT: '/wp-json/wc/store/v1/checkout',
  NONCE: '/api/nonce',
};

/**
 * Types for cart items
 */
export interface CartItem {
  id: string;
  productId: string;
  variationId?: string;
  quantity: number;
  name: string;
  price: string;
  image?: {
    url: string;
    altText?: string;
  };
  attributes?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * Types for Store API responses
 */
export interface StoreApiCartResponse {
  items: Array<{
    key: string;
    id: number;
    quantity: number;
    name: string;
    prices: {
      price: string;
      regular_price: string;
      sale_price: string;
      currency_code: string;
      currency_symbol: string;
    };
    totals: {
      line_subtotal: string;
      line_total: string;
    };
    variation: Array<{
      attribute: string;
      value: string;
    }> | null;
    item_data: Record<string, any>;
    _links: Record<string, any>;
  }>;
  totals: {
    total_items: string;
    total_items_tax: string;
    total_fees: string;
    total_fees_tax: string;
    total_discount: string;
    total_discount_tax: string;
    total_shipping: string;
    total_shipping_tax: string;
    total_price: string;
    total_tax: string;
    tax_lines: Array<{
      name: string;
      price: string;
      rate: string;
    }>;
  };
}

export interface StoreApiCheckoutResponse {
  order_id: number;
  status: string;
  order_key: string;
  customer_id: number;
  payment_result: {
    payment_status: string;
    payment_details: Array<{
      key: string;
      value: string;
    }>;
    redirect_url: string;
  };
}

/**
 * Parse a product ID that might be in different formats
 * Handles numeric IDs, string IDs, and base64 encoded GraphQL IDs
 */
export function parseProductId(productId: string | number): number | string {
  // If already a number, return it
  if (typeof productId === 'number') {
    return productId;
  }
  
  // If numeric string, convert to number
  if (/^[0-9]+$/.test(productId)) {
    return Number(productId);
  }
  
  // For base64 encoded IDs (like GraphQL IDs), try to extract the numeric ID
  try {
    // Try to decode if it's base64
    if (productId.includes('=')) {
      const decoded = Buffer.from(productId, 'base64').toString();
      // Extract numeric ID if in format like "post:123"
      const match = decoded.match(/(\d+)$/);
      if (match) {
        return Number(match[1]);
      }
    }
  } catch (error) {
    console.warn('Error parsing product ID:', error);
  }
  
  // If all else fails, return the original ID
  return productId;
}

/**
 * Fetch a valid nonce for Store API requests
 * Tries multiple sources to get a valid nonce
 */
export async function fetchNonce(): Promise<string> {
  try {
    // Try to get nonce from the cart endpoint first
    const nonce = await fetchNonceFromCart();
    if (nonce) {
      return nonce;
    }
    
    // If that fails, try our custom nonce endpoint
    const customNonce = await fetchNonceFromCustomEndpoint();
    if (customNonce) {
      return customNonce;
    }
    
    // If all else fails, try the products endpoint
    const productsNonce = await fetchNonceFromProducts();
    if (productsNonce) {
      return productsNonce;
    }
    
    throw new Error('Could not obtain a valid nonce from any source');
  } catch (error) {
    console.error('Error fetching nonce:', error);
    throw error;
  }
}

/**
 * Try to fetch a nonce from the cart endpoint
 */
async function fetchNonceFromCart(): Promise<string | null> {
  try {
    if (!baseUrl) {
      throw new Error('WooCommerce URL not configured');
    }
    
    const response = await fetch(`${baseUrl}${ENDPOINTS.CART}`, 
      cartSession.fetchOptions('GET')
    );

    // Try to get nonce from headers first (case insensitive check)
    const nonceHeader = response.headers.get('x-wc-store-api-nonce') || 
                        response.headers.get('X-WC-Store-API-Nonce');
    if (nonceHeader) {
      return nonceHeader;
    }

    // If not in headers, check the response body extensions
    try {
      const data = await response.json();
      
      // Some WooCommerce setups include the nonce in the response body extensions
      if (data.extensions && data.extensions.store_api_nonce) {
        return data.extensions.store_api_nonce;
      }
    } catch (e) {
      console.warn('Error parsing cart response:', e);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching nonce from cart:', error);
    return null;
  }
}

/**
 * Try to fetch a nonce from our custom endpoint
 */
async function fetchNonceFromCustomEndpoint(): Promise<string | null> {
  try {
    const response = await fetch('/api/ankkor/v1/nonce', 
      cartSession.fetchOptions('GET')
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.nonce) {
      return data.nonce;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching nonce from custom endpoint:', error);
    return null;
  }
}

/**
 * Try to fetch a nonce from the products endpoint
 */
async function fetchNonceFromProducts(): Promise<string | null> {
  try {
    if (!baseUrl) {
      throw new Error('WooCommerce URL not configured');
    }
    
    const response = await fetch(`${baseUrl}/wp-json/wc/store/v1/products?per_page=1`, 
      cartSession.fetchOptions('GET')
    );

    // Try to get nonce from headers (case insensitive check)
    const nonceHeader = response.headers.get('x-wc-store-api-nonce') || 
                        response.headers.get('X-WC-Store-API-Nonce');
    if (nonceHeader) {
      return nonceHeader;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching nonce from products:', error);
    return null;
  }
}

/**
 * Get the current cart from the Store API
 */
export const getCart = withRetry(async (nonce: string): Promise<StoreApiCartResponse> => {
  if (!baseUrl) {
    throw new Error('WooCommerce URL not configured');
  }

  const response = await fetch(`${baseUrl}${ENDPOINTS.CART}`, 
    cartSession.fetchOptions('GET', nonce)
  );

  if (!response.ok) {
    throw new Error(`Failed to get cart: ${response.status}`);
  }

  return await response.json();
}, { retryableError: isRetryableApiError });

/**
 * Clear the cart (remove all items)
 */
export const clearCart = withRetry(async (nonce: string): Promise<StoreApiCartResponse> => {
  if (!baseUrl) {
    throw new Error('WooCommerce URL not configured');
  }

  const response = await fetch(`${baseUrl}${ENDPOINTS.CART_ITEMS}`, 
    cartSession.fetchOptions('DELETE', nonce)
  );

  if (!response.ok) {
    throw new Error(`Failed to clear cart: ${response.status}`);
  }

  return await response.json();
}, { retryableError: isRetryableApiError });

/**
 * Add an item to the cart
 */
export const addItemToCart = withRetry(async (
  nonce: string,
  productId: number | string,
  quantity: number,
  variationId?: number | string,
  variationData?: Record<string, string>
): Promise<StoreApiCartResponse> => {
  if (!baseUrl) {
    throw new Error('WooCommerce URL not configured');
  }

  const cartData: Record<string, any> = {
    id: parseProductId(productId),
    quantity,
  };

  if (variationId) {
    cartData.variation_id = parseProductId(variationId);
  }

  if (variationData) {
    cartData.variation = variationData;
  }

  const response = await fetch(`${baseUrl}${ENDPOINTS.ADD_ITEM}`, 
    cartSession.fetchOptions('POST', nonce, cartData)
  );

  if (!response.ok) {
    throw new Error(`Failed to add item to cart: ${response.status}`);
  }

  return await response.json();
}, { retryableError: isRetryableApiError });

/**
 * Sync the local cart with WooCommerce Store API
 * This function first clears the server cart and then adds all items from the local cart
 */
export const syncCartToWoo = withRetry(async (
  nonce: string,
  items: CartItem[]
): Promise<StoreApiCartResponse> => {
  if (!baseUrl) {
    throw new Error('WooCommerce URL not configured');
  }

  if (items.length === 0) {
    throw new Error('Cart is empty');
  }

  // First clear the existing cart
  await clearCart(nonce);

  // Then add each item one by one
  let cartResponse: StoreApiCartResponse | null = null;

  for (const item of items) {
    // Prepare variation data if attributes exist
    const variationData: Record<string, string> = {};
    if (item.attributes && item.attributes.length > 0) {
      item.attributes.forEach(attr => {
        const key = `attribute_${attr.name.toLowerCase().replace(/\s+/g, '-')}`;
        variationData[key] = attr.value;
      });
    }

    // Add item to cart
    cartResponse = await addItemToCart(
      nonce,
      item.productId,
      item.quantity,
      item.variationId,
      Object.keys(variationData).length > 0 ? variationData : undefined
    );
  }

  if (!cartResponse) {
    throw new Error('Failed to sync cart with WooCommerce');
  }

  return cartResponse;
}, { retryableError: isRetryableApiError });

/**
 * Process checkout using the Store API
 */
export const processCheckout = withRetry(async (
  nonce: string,
  checkoutData: {
    billing_address: Record<string, any>;
    shipping_address: Record<string, any>;
    customer_note?: string;
    payment_method: string;
    payment_data?: Record<string, any>;
    extensions?: Record<string, any>;
  }
): Promise<StoreApiCheckoutResponse> => {
  if (!baseUrl) {
    throw new Error('WooCommerce URL not configured');
  }

  const response = await fetch(`${baseUrl}${ENDPOINTS.CHECKOUT}`, 
    cartSession.fetchOptions('POST', nonce, checkoutData)
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Checkout failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}, { retryableError: isRetryableApiError }); 