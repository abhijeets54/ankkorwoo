# Store API Integration Fixes

This document outlines the fixes made to the WooCommerce Store API integration to address issues with nonce handling and product ID parsing.

## Nonce Handling

The initial implementation had issues with nonce extraction. We've updated the code to handle nonces in multiple ways:

1. **Multiple Nonce Sources**:
   - Extract nonce from response headers (`X-WC-Store-API-Nonce`)
   - Extract nonce from response body extensions (`extensions.store_api_nonce`)
   - Fall back to our custom nonce API endpoint

2. **Improved Error Handling**:
   - Better error messages for missing nonces
   - Proper handling of response parsing errors
   - Clearer logging of nonce extraction

## Product ID Parsing

The original implementation assumed all product IDs were numeric, but WooCommerce can use different ID formats, especially when using GraphQL. We've added:

1. **Flexible ID Parsing**:
   - Support for numeric IDs (e.g., `123`)
   - Support for string IDs (e.g., `"product-123"`)
   - Support for base64 encoded GraphQL IDs (e.g., `"cG9zdDoxMjM="`)

2. **ID Extraction Logic**:
   - For base64 IDs, decode and extract the numeric portion
   - Fallback to using the original ID if parsing fails
   - Proper error handling for malformed IDs

## Response Parsing Improvements

We've improved the handling of API responses:

1. **Better Error Detection**:
   - Check response status codes properly
   - Extract error messages from response bodies
   - Handle JSON parsing errors gracefully

2. **Robust Data Extraction**:
   - Check for data in different parts of the response
   - Handle missing or malformed data
   - Provide clear error messages for debugging

## Testing

To test these fixes:

1. Run the updated test script:
   ```bash
   npm run test-store-api
   ```

2. The script now:
   - Properly extracts nonces from both headers and body
   - Handles different product ID formats
   - Provides better error messages for debugging

## Configuration Requirements

For the Store API integration to work correctly:

1. **WooCommerce Settings**:
   - Ensure "Allow customers to place orders without an account" is enabled
   - Set permalinks to "Post name"
   - Configure CORS to allow requests from your frontend domain

2. **WPGraphQL Settings**:
   - Ensure "Disable GQL Session Handler" is unchecked
   - If using JWT authentication, verify the secret key is properly set

3. **Store API Nonce**:
   - Some WooCommerce configurations provide the nonce in headers
   - Others provide it in the response body extensions
   - Our code now handles both approaches 