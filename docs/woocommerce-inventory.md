# WooCommerce Inventory Management

This document outlines how inventory is managed and synchronized between WooCommerce and the Ankkor website.

## Overview

The inventory management system ensures that product availability and stock levels are accurately reflected on the website by:

1. **Real-time Updates via Webhooks**: When inventory changes in WooCommerce (due to purchases, manual updates, etc.), webhooks notify our application and update the frontend.
2. **Periodic Reconciliation**: Regular checks ensure data consistency between WooCommerce and the website cache.
3. **Efficient Caching**: Product and inventory data is cached for performance while maintaining accuracy.

## Architecture

### 1. WooCommerce Integration

- **Data Source**: WooCommerce is the single source of truth for inventory data
- **API Access**: We use WooCommerce's GraphQL API to fetch product and inventory information
- **Authentication**: Secure API access using consumer key and secret
- **Rate Limiting**: Respects WooCommerce API rate limits

### 2. Webhooks

- **Endpoint**: `/api/webhooks/woocommerce`
- **Events**: Listens to product update events from WooCommerce
- **Security**: All webhooks are validated with proper authentication
- **Processing**: Updates the local cache and triggers revalidation of affected pages

### 3. Caching Strategy

- **Next.js ISR**: Uses Incremental Static Regeneration for product pages
- **API Routes**: Cached responses with appropriate revalidation periods
- **Tag-based Invalidation**: Selective cache invalidation based on product changes

## Implementation

### Product Data Flow

1. **Initial Load**:
   - User visits a product page
   - Next.js checks if cached version exists
   - If not cached or expired, fetches fresh data from WooCommerce
   - Renders page with current inventory data

2. **Real-time Updates**:
   - WooCommerce sends a webhook when inventory changes
   - Webhook handler processes the update
   - Affected pages are revalidated
   - Users see updated inventory on next page load

3. **Reconciliation**:
   - Scheduled job runs periodically
   - Compares cached data with WooCommerce data
   - Updates any discrepancies found

### Webhook Handler

The webhook handler receives inventory updates from WooCommerce and processes them:

```typescript
// /api/webhooks/woocommerce/route.ts
export async function POST(request: Request) {
  try {
    // Validate webhook authenticity
    const isValid = await validateWooCommerceWebhook(request);
    if (!isValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    
    // Process the webhook based on event type
    if (body.event === 'product.updated') {
      await handleProductUpdate(body.data);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Error', { status: 500 });
  }
}
```

### Inventory Reconciliation

```typescript
// Periodic reconciliation function
async function reconcileInventory() {
  // Fetch all products from WooCommerce
  const wooProducts = await fetchAllWooCommerceProducts();
  
  // Compare with cached data and update discrepancies
  for (const product of wooProducts) {
    await updateProductCache(product);
  }
}
```

## Configuration

### Environment Variables

```env
# WooCommerce API Configuration
WOOCOMMERCE_STORE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret
WOOCOMMERCE_GRAPHQL_URL=https://your-store.com/graphql

# Webhook Configuration
WOOCOMMERCE_WEBHOOK_SECRET=your_webhook_secret
```

### Setting Up Webhooks in WooCommerce

1. In your WooCommerce admin, go to **WooCommerce** > **Settings** > **Advanced** > **Webhooks**
2. Click **Add webhook**
3. Configure:
   - **Name**: Ankkor Inventory Updates
   - **Status**: Active
   - **Topic**: Product updated
   - **Delivery URL**: `https://your-domain.com/api/webhooks/woocommerce`
   - **Secret**: Use the same value as `WOOCOMMERCE_WEBHOOK_SECRET`

## Monitoring and Troubleshooting

### Common Issues

- **Webhook not received**: Verify the webhook URL is correct in WooCommerce admin
- **Authentication failures**: Check consumer key and secret configuration
- **Missing inventory updates**: Check WooCommerce webhook delivery history
- **Cache inconsistencies**: Run manual reconciliation or check revalidation logic

### Monitoring

- Monitor webhook delivery success rates
- Track cache hit/miss ratios
- Alert on inventory sync failures
- Log all webhook processing for debugging

## Performance Considerations

- **Batch Updates**: Process multiple inventory changes in batches when possible
- **Selective Revalidation**: Only revalidate pages affected by inventory changes
- **CDN Integration**: Use CDN cache tags for efficient invalidation
- **Rate Limiting**: Respect WooCommerce API limits to avoid throttling

## Security

- **Webhook Validation**: Always validate webhook authenticity
- **API Security**: Use secure consumer keys and secrets
- **Environment Variables**: Store sensitive configuration in environment variables
- **HTTPS Only**: Ensure all API communication uses HTTPS
