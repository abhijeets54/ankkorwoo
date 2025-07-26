# Ankkor Shopify to WooCommerce Migration Notes

This document contains important information about migrating the Ankkor e-commerce site from Shopify to a headless WooCommerce backend while maintaining the Next.js 14 frontend.

## Migration Overview

We're moving from Shopify's Storefront API to a headless WooCommerce setup, using WPGraphQL and WooGraphQL for API access. This allows for greater control, customization, and potentially lower long-term costs while keeping the existing frontend intact.

## Prerequisites

Before beginning the migration, ensure you have:

1. A WordPress installation with WooCommerce installed and configured
2. Required plugins:
   - WooCommerce
   - WPGraphQL
   - WooGraphQL (WPGraphQL for WooCommerce)
   - WPGraphQL-JWT-Authentication
3. Proper WordPress permalinks set up (Post name structure)
4. API credentials created
5. Development environment set up with Node.js and required dependencies

See [WooCommerce Headless Setup Guide](./docs/woocommerce-setup.md) for detailed setup instructions.

## Key Files and Components

The migration consists of several key components:

1. **API Integration Layer**: `src/lib/woocommerce.ts` - Core GraphQL integration with WooCommerce
2. **Inventory Mapping**: `src/lib/wooInventoryMapping.ts` - Maps product IDs between systems
3. **Authentication**: `src/lib/wooAuth.ts` - Handles user authentication with WooCommerce
4. **Cart State**: `src/lib/wooStore.ts` - Zustand store for cart management
5. **Data Synchronization**: `src/lib/wooQstash.ts` - Background jobs for data sync
6. **Checkout API**: `src/app/api/checkout/route.ts` - Server-side checkout processing
7. **Sync Endpoint**: `src/app/api/woo-sync/route.ts` - Endpoint for data synchronization
8. **Migration Utility**: `scripts/shopify-to-woo-mapping.ts` - Helps map product IDs between systems

## Migration Steps

### 1. Set Up WordPress & WooCommerce (Backend)

Follow the detailed instructions in [WooCommerce Headless Setup Guide](./docs/woocommerce-setup.md) to:

- Install WordPress
- Install and configure required plugins
- Set up API credentials
- Configure CORS and JWT authentication
- Configure WooCommerce settings
- Set up webhooks

### 2. Prepare the Development Environment

1. Install the required dependencies:
   ```bash
   npm install
   ```

2. Copy the environment variables template:
   ```bash
   cp .env.woocommerce.example .env.local
   ```

3. Update the environment variables with your WooCommerce credentials.

### 3. Export and Import Product Data

1. Export products from Shopify:
   - Go to Shopify Admin > Products > Export
   - Select "All products" and CSV format
   - Save the CSV file to `data/shopify-products-export.csv`

2. Import products into WooCommerce:
   - Go to WooCommerce > Products > Import
   - Upload the CSV file (you may need to format it for WooCommerce)
   - Map fields and complete the import

3. Export products from WooCommerce:
   - Go to WooCommerce > Products > Export
   - Save the CSV file to `data/woo-products-export.csv`

4. Create product ID mappings:
   ```bash
   npm run migrate-mapping
   ```

### 4. Validate WooCommerce Integration

Run the validation script to ensure the WooCommerce integration is working:

```bash
npm run validate-woo-migration
```

This will test:
- Product retrieval
- Category retrieval
- Cart operations
- Authentication
- Inventory mapping

Fix any issues before proceeding.

### 5. Set Up Data Synchronization

Configure the recurring sync jobs for products and inventory:

```bash
npm run setup-woo-sync
```

This will:
- Schedule hourly inventory sync
- Schedule daily product sync
- Schedule weekly category sync

### 6. Transition Frontend Components

1. **Update Product Display Components**:
   - Update the product card component
   - Update the product detail page
   - Update the product listing page
   - Test with real WooCommerce products

2. **Update Cart Functionality**:
   - Modify cart components to use WooCommerce cart
   - Test add to cart, update quantity, and remove from cart

3. **Update Checkout Process**:
   - Implement the custom checkout flow
   - Integrate payment gateways
   - Test the complete checkout process

4. **Update User Authentication**:
   - Modify login/register components
   - Update account pages
   - Test user registration, login, and account management

### 7. Testing and Validation

1. **Functional Testing**:
   - Test all user flows (browsing, adding to cart, checkout)
   - Test user account functionality
   - Test search and filtering

2. **Performance Testing**:
   - Test page load times
   - Test API response times
   - Optimize as needed

3. **Cross-Browser Testing**:
   - Test on multiple browsers
   - Test on mobile devices

### 8. Launch Preparation

1. **Final Data Migration**:
   - Perform a final export from Shopify
   - Import into WooCommerce
   - Update product mappings

2. **DNS Configuration**:
   - Update DNS settings to point to the new implementation
   - Configure proper redirects

3. **Monitoring Setup**:
   - Set up monitoring for the WooCommerce site
   - Configure alerts for synchronization failures

### 9. Launch

1. **Pre-Launch Checklist**:
   - Verify all functionality
   - Check payment processing
   - Ensure webhooks are correctly configured

2. **Launch**:
   - Switch DNS
   - Monitor for issues

3. **Post-Launch**:
   - Continue monitoring
   - Address any issues that arise

### 10. Shopify Decommissioning

After confirming the WooCommerce implementation is stable:

1. Export any final data from Shopify
2. Back up the Shopify store
3. Cancel Shopify subscription

## Migration Timeline

| Phase | Description | Estimated Duration |
|-------|-------------|-------------------|
| 1 | WordPress & WooCommerce Setup | 1-2 days |
| 2 | Product Data Migration | 1-2 days |
| 3 | API Integration | 3-5 days |
| 4 | Frontend Component Updates | 5-7 days |
| 5 | Testing and Validation | 3-5 days |
| 6 | Launch Preparation | 1-2 days |
| 7 | Launch | 1 day |
| **Total** | | **15-24 days** |

## Rollback Plan

In case of critical issues:

1. Keep Shopify active during initial testing
2. Maintain DNS fallback capability
3. Document rollback procedure for quick reversion

## Support

For additional help:

1. WooCommerce documentation: [https://woocommerce.com/documentation/](https://woocommerce.com/documentation/)
2. WPGraphQL documentation: [https://www.wpgraphql.com/docs/](https://www.wpgraphql.com/docs/)
3. WooGraphQL documentation: [https://woographql.com/docs/](https://woographql.com/docs/) 