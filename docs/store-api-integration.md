# WooCommerce Store API Integration Guide

This guide provides detailed instructions for integrating with the WooCommerce Store API in a headless Next.js application.

## Overview

The WooCommerce Store API is a REST API that allows frontend applications to interact with WooCommerce cart, checkout, and product functionality. It's designed specifically for headless commerce applications.

Key features:
- Cart management (add, update, remove items)
- Checkout processing
- Product browsing
- Customer authentication
- Order management

## Prerequisites

Before integrating with the Store API, ensure your WooCommerce installation is properly configured:

1. **WooCommerce Version**: 5.0.0 or higher
2. **WordPress Version**: 5.6 or higher
3. **Pretty Permalinks**: Enabled (Settings > Permalinks > Post name)
4. **CORS**: Configured to allow requests from your frontend domain
5. **Guest Checkout**: Enabled (WooCommerce > Settings > Accounts & Privacy)

## API Endpoints

The Store API uses the following base path: `/wp-json/wc/store/v1/`

Common endpoints:
- `/cart` - Get or update the cart
- `/cart/items` - Manage cart items
- `/cart/add-item` - Add an item to the cart
- `/cart/update-item` - Update a cart item
- `/cart/remove-item` - Remove an item from the cart
- `/checkout` - Process checkout
- `/products` - Get products
- `/products/<id>` - Get a specific product

## Authentication

The Store API uses a combination of methods for authentication:

1. **Cart Token**: A unique identifier for guest carts
2. **Nonce**: A security token required for mutations
3. **Customer Authentication**: For logged-in users (optional)

### Cart Token

The Cart Token is sent in the `Cart-Token` header and allows the API to identify a specific guest cart session.

```typescript
// Example of generating and storing a cart token
const cartToken = `cart_${Math.random().toString(36).substring(2)}_${Date.now()}`;
localStorage.setItem('woo_cart_token', cartToken);
```

### Nonce Handling

The Store API requires a nonce for all mutation operations (add, update, remove, checkout). The nonce is:

1. Initially obtained from a GET request to `/cart` or other endpoints
2. Returned in the `X-WC-Store-API-Nonce` header or in the response body's `extensions.store_api_nonce`
3. Must be included in subsequent requests in the `X-WC-Store-API-Nonce` header

```typescript
// Example of fetching and using a nonce
async function fetchNonce() {
  const response = await fetch('/wp-json/wc/store/v1/cart', {
    headers: {
      'Cart-Token': cartToken
    }
  });
  
  // Try to get nonce from headers
  let nonce = response.headers.get('x-wc-store-api-nonce');
  
  // If not in headers, check response body
  if (!nonce) {
    const data = await response.json();
    if (data.extensions && data.extensions.store_api_nonce) {
      nonce = data.extensions.store_api_nonce;
    }
  }
  
  return nonce;
}
```

## Cart Operations

### Fetching the Cart

```typescript
async function getCart(nonce) {
  const response = await fetch('/wp-json/wc/store/v1/cart', {
    headers: {
      'Cart-Token': cartToken,
      'X-WC-Store-API-Nonce': nonce
    }
  });
  
  return await response.json();
}
```

### Adding an Item to Cart

```typescript
async function addToCart(nonce, productId, quantity = 1, variationId = null) {
  const data = {
    id: productId,
    quantity
  };
  
  if (variationId) {
    data.variation_id = variationId;
  }
  
  const response = await fetch('/wp-json/wc/store/v1/cart/add-item', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cart-Token': cartToken,
      'X-WC-Store-API-Nonce': nonce
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
}
```

### Updating Cart Items

```typescript
async function updateCartItem(nonce, key, quantity) {
  const response = await fetch('/wp-json/wc/store/v1/cart/update-item', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cart-Token': cartToken,
      'X-WC-Store-API-Nonce': nonce
    },
    body: JSON.stringify({
      key,
      quantity
    })
  });
  
  return await response.json();
}
```

### Removing Items from Cart

```typescript
async function removeCartItem(nonce, key) {
  const response = await fetch('/wp-json/wc/store/v1/cart/remove-item', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cart-Token': cartToken,
      'X-WC-Store-API-Nonce': nonce
    },
    body: JSON.stringify({
      key
    })
  });
  
  return await response.json();
}
```

### Clearing the Cart

```typescript
async function clearCart(nonce) {
  const response = await fetch('/wp-json/wc/store/v1/cart/items', {
    method: 'DELETE',
    headers: {
      'Cart-Token': cartToken,
      'X-WC-Store-API-Nonce': nonce
    }
  });
  
  return await response.json();
}
```

## Checkout Process

The checkout process involves:

1. Adding items to the cart
2. Setting shipping/billing addresses
3. Selecting shipping method
4. Processing payment

```typescript
async function checkout(nonce, billingAddress, shippingAddress = null) {
  const checkoutData = {
    billing_address: billingAddress,
    shipping_address: shippingAddress || billingAddress,
    payment_method: 'cod' // Cash on delivery for testing
  };
  
  const response = await fetch('/wp-json/wc/store/v1/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cart-Token': cartToken,
      'X-WC-Store-API-Nonce': nonce
    },
    body: JSON.stringify(checkoutData)
  });
  
  return await response.json();
}
```

## Error Handling

The Store API returns standard HTTP status codes along with detailed error information in the response body:

```json
{
  "code": "woocommerce_rest_missing_nonce",
  "message": "Missing the Nonce header. This endpoint requires a valid nonce.",
  "data": {
    "status": 401
  }
}
```

Implement robust error handling:

```typescript
async function makeStoreApiRequest(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`${data.code}: ${data.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Store API error:', error);
    throw error;
  }
}
```

## Best Practices

1. **Implement Retry Logic**: Add exponential backoff for failed requests
2. **Cache Nonces**: Store nonces temporarily to reduce API calls
3. **Handle Cart Persistence**: Save cart tokens in localStorage with expiry
4. **Implement Error Recovery**: Provide clear error messages and recovery options
5. **Optimize Requests**: Batch operations when possible
6. **Test Guest Checkout**: Ensure guest checkout works correctly
7. **Monitor API Usage**: Track API usage and performance

## Common Issues and Solutions

### Missing Nonce Header

**Issue**: `401 - Missing the Nonce header. This endpoint requires a valid nonce.`

**Solution**:
- Ensure you're fetching a nonce before making mutation requests
- Check that the nonce is correctly included in the `X-WC-Store-API-Nonce` header
- Try multiple sources for nonces (headers, response body)

### Invalid Product ID

**Issue**: `400 - Invalid product ID`

**Solution**:
- Ensure you're using the correct product ID format (numeric ID for REST API)
- If using GraphQL IDs, extract the numeric portion
- Verify the product exists and is published

### Cart Session Issues

**Issue**: Cart items disappear or cart state is inconsistent

**Solution**:
- Ensure consistent Cart-Token usage across requests
- Implement cart synchronization between local state and server
- Add error recovery for cart operations

## Testing

Test your Store API integration thoroughly:

1. **Manual Testing**: Use browser developer tools to inspect requests
2. **Automated Testing**: Write integration tests for cart and checkout flows
3. **Edge Cases**: Test with various product types, guest vs. logged-in users
4. **Error Scenarios**: Test network failures, invalid inputs, etc.

## Debugging Tools

1. **WooCommerce Logs**: Check `wp-content/uploads/wc-logs/` for API errors
2. **Browser DevTools**: Monitor network requests and responses
3. **Custom Debug Endpoints**: Create endpoints to verify nonce and cart state

## Resources

- [WooCommerce Store API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WooCommerce REST API Handbook](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction) 