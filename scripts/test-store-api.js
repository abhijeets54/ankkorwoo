/**
 * Test Script for WooCommerce Store API Integration
 * 
 * This script tests the Store API integration by:
 * 1. Fetching a nonce
 * 2. Clearing the cart
 * 3. Adding items to the cart
 * 4. Fetching the cart contents
 * 5. Testing guest checkout flow
 * 
 * Usage:
 * node scripts/test-store-api.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Global variables
const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || 'https://deepskyblue-penguin-370791.hostingersite.com';
const readline = require('readline');
const fetch = require('node-fetch');
const { Headers } = fetch;

// Generate a cart token or use an existing one
const cartToken = process.env.CART_TOKEN || `cart_${Math.random().toString(36).substring(2)}_${Date.now()}`;

// Store the nonce globally
global.nonce = null;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function for user input
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', body = null) {
  console.log(`\n=== Making ${method} request to ${endpoint} ===`);
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cart-Token': cartToken
  });

  // If we have a nonce, add it to the headers
  if (global.nonce) {
    console.log(`Using nonce: ${global.nonce}`);
    headers.append('X-WC-Store-API-Nonce', global.nonce);
  } else {
    console.log('No nonce available for this request');
  }

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  };

  if (body) {
    console.log('Request body:', JSON.stringify(body, null, 2));
  }

  try {
    console.log('Request headers:', Object.fromEntries(headers.entries()));
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    
    // Log response headers for debugging
    console.log('Response status:', response.status);
    console.log('Response headers:');
    response.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
    });
    
    // Store nonce from response headers if available
    const responseNonce = response.headers.get('x-wc-store-api-nonce');
    if (responseNonce) {
      global.nonce = responseNonce;
      console.log('Received nonce from headers:', global.nonce);
    }

    // Clone the response before reading it as JSON
    const responseClone = response.clone();
    
    try {
      const data = await response.json();
      console.log('Response body:', JSON.stringify(data, null, 2));
      
      // Check for nonce in response body extensions
      if (data.extensions && data.extensions.store_api_nonce) {
        global.nonce = data.extensions.store_api_nonce;
        console.log('Received nonce from body extensions:', global.nonce);
      }
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      
      return data;
    } catch (jsonError) {
      // If JSON parsing fails, try to get the text content
      const text = await responseClone.text();
      console.log('Response text:', text);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} - ${text}`);
      }
      
      return text;
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Function to fetch the cart
async function fetchCart() {
  console.log('\n=== Fetching Cart ===');
  try {
    const response = await makeRequest('/wp-json/wc/store/v1/cart');
    console.log('Cart fetched successfully');
    return response;
  } catch (error) {
    console.error('Failed to fetch cart:', error);
    return null;
  }
}

// Function to clear the cart
async function clearCart() {
  console.log('\n=== Clearing Cart ===');
  try {
    const response = await makeRequest('/wp-json/wc/store/v1/cart/items', 'DELETE');
    console.log('Cart cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear cart:', error);
    return false;
  }
}

// Function to add an item to the cart
async function addItemToCart(productId, quantity = 1, variationId = null) {
  console.log(`\n=== Adding Item to Cart (Product ID: ${productId}) ===`);
  
  // Parse the product ID - handle both numeric and base64 encoded IDs
  let parsedId;
  if (/^[0-9]+$/.test(productId)) {
    // If the ID is numeric, use it directly
    parsedId = Number(productId);
  } else {
    // For base64 encoded IDs (like GraphQL IDs), try to extract the numeric ID
    try {
      // Try to decode if it's base64
      if (productId.includes('=')) {
        const decoded = Buffer.from(productId, 'base64').toString();
        // Extract numeric ID if in format like "post:123"
        const match = decoded.match(/(\d+)$/);
        if (match) {
          parsedId = Number(match[1]);
        } else {
          console.log('Could not extract numeric ID from decoded string:', decoded);
          // Use a fallback approach - try to get product by database ID
          parsedId = productId;
        }
      } else {
        // If not base64, try to use as is
        parsedId = productId;
      }
    } catch (error) {
      console.warn('Error parsing product ID, using as is:', error);
      parsedId = productId;
    }
  }

  console.log(`Parsed product ID: ${parsedId}`);
  
  const cartData = {
    id: parsedId,
    quantity
  };

  if (variationId) {
    cartData.variation_id = Number(variationId);
  }

  try {
    const response = await makeRequest('/wp-json/wc/store/v1/cart/add-item', 'POST', cartData);
    console.log('Item added to cart:', JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to add item to cart:', error);
    return false;
  }
}

// Function to get checkout URL
async function getCheckoutUrl() {
  console.log('\n=== Getting Checkout URL ===');
  try {
    const response = await makeRequest('/wp-json/wc/store/v1/checkout');
    console.log('Checkout URL:', response.checkout_url);
    return response.checkout_url;
  } catch (error) {
    console.error('Failed to get checkout URL:', error);
    return null;
  }
}

// Main function to run tests
async function runTests() {
  console.log('=== WooCommerce Store API Integration Test ===');
  console.log('Base URL:', baseUrl);
  console.log('Cart Token:', cartToken);

  // First, fetch the cart to get a nonce
  console.log('\n=== Fetching Nonce ===');
  try {
    const initialCartResponse = await makeRequest('/wp-json/wc/store/v1/cart');
    console.log('Cart response:', JSON.stringify(initialCartResponse, null, 2));
    
    // If we still don't have a nonce, try the custom nonce endpoint
    if (!global.nonce) {
      console.log('\n=== Fetching Nonce from Custom Endpoint ===');
      try {
        const nonceResponse = await fetch(`${baseUrl}/wp-json/ankkor/v1/nonce`, {
          headers: {
            'Content-Type': 'application/json',
            'Cart-Token': cartToken
          }
        });
        const nonceData = await nonceResponse.json();
        if (nonceData && nonceData.nonce) {
          global.nonce = nonceData.nonce;
          console.log('Received nonce from custom endpoint:', global.nonce);
        }
      } catch (nonceError) {
        console.error('Failed to fetch nonce from custom endpoint:', nonceError);
      }
    }
    
    // If we still don't have a nonce, abort
    if (!global.nonce) {
      console.error('Could not obtain a valid nonce. Aborting tests.');
      rl.close();
      return;
    }
    
    // Clear the cart
    const cartCleared = await clearCart();
    if (!cartCleared) {
      console.log('Failed to clear cart. Continuing with tests...');
    }
    
    // Ask for product ID
    const productId = await askQuestion('Enter a product ID to add to cart: ');
    
    // Add item to cart
    const itemAdded = await addItemToCart(productId);
    if (!itemAdded) {
      console.log('Failed to add item to cart. Aborting tests.');
      rl.close();
      return;
    }
    
    // Get checkout URL
    const checkoutUrl = await getCheckoutUrl();
    if (checkoutUrl) {
      console.log('Checkout URL obtained successfully:', checkoutUrl);
    }
    
    console.log('\n=== Tests completed ===');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    rl.close();
  }
}

// Run the tests
runTests(); 