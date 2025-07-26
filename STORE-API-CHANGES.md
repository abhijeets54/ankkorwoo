# Store API Integration Changes

## Summary

We've refactored the cart synchronization and checkout flow to use the WooCommerce Store API exclusively, removing the URL-based fallback methods. This provides a more robust and consistent experience for both guest and authenticated users.

## Files Created

1. **Cart Session Management**:
   - `src/lib/cartSession.ts` - Manages cart tokens for guest sessions

2. **Retry Logic**:
   - `src/lib/withRetry.ts` - Implements exponential backoff for API calls

3. **Store API Service**:
   - `src/lib/storeApi.ts` - Provides interface for Store API operations

4. **Nonce API Endpoint**:
   - `src/app/api/nonce/route.ts` - Fetches valid Store API nonce

5. **Advanced Order Creation**:
   - `src/lib/advanced-order.ts` - Uses GraphQL for special order cases

6. **Testing and Documentation**:
   - `scripts/test-store-api.js` - Manual testing script
   - `src/tests/storeApiCheckout.test.ts` - Integration tests
   - `docs/store-api-integration.md` - Documentation

## Files Modified

1. **Local Cart Store**:
   - `src/lib/localCartStore.ts` - Updated to use Store API for cart sync

## Key Improvements

1. **Reliability**:
   - Consistent cart synchronization using Store API
   - Retry logic with exponential backoff for transient errors
   - Proper error handling and reporting

2. **Guest Checkout**:
   - Persistent cart token for guest sessions
   - Proper headers for Store API requests
   - Simplified checkout flow

3. **Performance**:
   - Reduced network requests
   - Optimized cart synchronization
   - Improved error recovery

## Testing

1. **Manual Testing**:
   ```bash
   npm run test-store-api
   ```

2. **Integration Tests**:
   - Tests for cart token generation and persistence
   - Tests for nonce fetching
   - Tests for cart synchronization
   - Tests for checkout processing
   - Tests for retry logic

## WooCommerce Configuration

For this integration to work properly, ensure the following WooCommerce settings:

1. **Guest Checkout**: Enable "Allow customers to place orders without an account" in WooCommerce > Settings > Accounts & Privacy
2. **Permalinks**: Set to "Post name" in Settings > Permalinks
3. **WPGraphQL Settings**: Ensure "Disable GQL Session Handler" is unchecked in GraphQL > Settings > WooCommerce 