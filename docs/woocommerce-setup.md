# WooCommerce Headless Setup Guide

This guide provides step-by-step instructions for setting up a headless WooCommerce backend for the Ankkor e-commerce site.

## Prerequisites

- A WordPress hosting account (recommend managed WordPress hosting like WP Engine, Kinsta, or Cloudways)
- SSH access to the server (for installing and configuring plugins)
- Basic knowledge of WordPress administration
- Domain name configured to point to the WordPress installation

## Installation Steps

### 1. Install WordPress

Start with a fresh WordPress installation:

1. Set up WordPress using your host's one-click installer or manual installation
2. Complete the initial WordPress setup (admin user, site title, etc.)
3. Log in to the WordPress admin dashboard

### 2. Install Required Plugins

Install and activate the following plugins:

#### Core Plugins

1. **WooCommerce**
   - Go to Plugins > Add New
   - Search for "WooCommerce"
   - Install and activate the plugin
   - Complete the setup wizard (you can skip most settings as we'll configure them later)

2. **WPGraphQL**
   - Download from [https://github.com/wp-graphql/wp-graphql/releases](https://github.com/wp-graphql/wp-graphql/releases)
   - Go to Plugins > Add New > Upload Plugin
   - Upload the ZIP file and activate

3. **WooGraphQL (WPGraphQL for WooCommerce)**
   - Download from [https://github.com/wp-graphql/wp-graphql-woocommerce/releases](https://github.com/wp-graphql/wp-graphql-woocommerce/releases)
   - Go to Plugins > Add New > Upload Plugin
   - Upload the ZIP file and activate

4. **WPGraphQL-JWT-Authentication**
   - Download from [https://github.com/wp-graphql/wp-graphql-jwt-authentication/releases](https://github.com/wp-graphql/wp-graphql-jwt-authentication/releases)
   - Go to Plugins > Add New > Upload Plugin
   - Upload the ZIP file and activate

#### Additional Recommended Plugins

5. **WP REST API Controller**
   - For fine-tuning REST API access if needed

6. **ACF to WPGraphQL**
   - If using Advanced Custom Fields for additional product data

7. **WP Headless**
   - For additional headless CMS features

8. **Redis Object Cache**
   - For improved performance

### 3. Configure WordPress Settings

1. **Update Permalinks**
   - Go to Settings > Permalinks
   - Select "Post name" structure
   - Save changes

2. **Set Up CORS Support**
   - Add the following to your `.htaccess` file (for Apache) or Nginx configuration:

   For Apache:
   ```apache
   <IfModule mod_headers.c>
     Header set Access-Control-Allow-Origin "https://your-frontend-domain.com"
     Header set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
     Header set Access-Control-Allow-Credentials "true"
     Header set Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce"
   </IfModule>
   ```

   For Nginx:
   ```nginx
   add_header Access-Control-Allow-Origin "https://your-frontend-domain.com";
   add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
   add_header Access-Control-Allow-Credentials "true";
   add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce";
   ```

3. **JWT Authentication Setup**
   - Add the following to your wp-config.php file:

   ```php
   define('GRAPHQL_JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
   ```

   - Generate a secure secret key using a tool like [https://api.wordpress.org/secret-key/1.1/salt/](https://api.wordpress.org/secret-key/1.1/salt/)

### 4. Configure WooCommerce Settings

1. **General Settings**
   - Go to WooCommerce > Settings
   - Configure store address, currency, and other general settings

2. **Product Settings**
   - Go to WooCommerce > Settings > Products
   - Configure measurement units, product ratings, etc.

3. **Tax Settings**
   - Go to WooCommerce > Settings > Tax
   - Configure tax rates and classes

4. **Shipping Settings**
   - Go to WooCommerce > Settings > Shipping
   - Configure shipping zones, methods, and classes

5. **Payment Gateways**
   - Go to WooCommerce > Settings > Payments
   - Enable and configure payment gateways (Stripe, PayPal, etc.)

6. **Emails**
   - Go to WooCommerce > Settings > Emails
   - Configure email templates and notifications

### 5. Create REST API Credentials

1. Go to WooCommerce > Settings > Advanced > REST API
2. Click "Add Key"
3. Enter a description (e.g., "Ankkor Frontend")
4. Set User to your admin account
5. Set Permissions to "Read/Write"
6. Generate API key
7. Save the Consumer Key and Consumer Secret for use in your Next.js application

### 6. GraphQL Configuration

1. **Test GraphQL Endpoint**
   - Visit `https://your-wordpress-site.com/graphql` in your browser or GraphQL client
   - You should see the GraphQL IDE or a JSON response

2. **Review Available Types**
   - Use GraphQL IDE to explore the schema
   - Verify that WooCommerce types are available (Product, ProductVariation, etc.)

### 7. Security Configuration

1. **Limit WordPress Access**
   - Install and configure a security plugin like Wordfence or Sucuri
   - Implement IP restrictions for admin areas if possible

2. **Implement Rate Limiting**
   - Configure server-level rate limiting for API endpoints
   - Add the following to your `.htaccess` file (for Apache):

   ```apache
   # Rate limiting for GraphQL
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteCond %{REQUEST_URI} ^/graphql$ [NC]
     RewriteCond %{HTTP_REFERER} !^https://your-frontend-domain\.com [NC]
     RewriteRule .* - [F,L]
   </IfModule>
   ```

3. **Configure JWT Authentication Properly**
   - Ensure token expiration is properly set
   - Implement token refresh mechanism

### 8. Import Products

1. **Prepare Product Data**
   - Export products from Shopify
   - Format the CSV for WooCommerce import

2. **Import Products**
   - Go to WooCommerce > Products > Import
   - Upload the prepared CSV file
   - Map fields and complete the import

3. **Verify Product Data**
   - Check several products to ensure all data was imported correctly
   - Add missing information as needed

### 9. Configure Webhooks

1. Go to WooCommerce > Settings > Advanced > Webhooks
2. Create webhooks for the following events:
   - Product created/updated
   - Order created/updated
   - Inventory updated

3. Set the delivery URL to your Next.js API routes:
   - `https://your-frontend-domain.com/api/webhooks/products`
   - `https://your-frontend-domain.com/api/webhooks/orders`
   - `https://your-frontend-domain.com/api/webhooks/inventory`

4. Set the Secret to a secure value (store this in your Next.js environment variables)

## Next.js Integration

After completing the WordPress/WooCommerce setup, update your Next.js application with the necessary environment variables:

1. Copy `.env.woocommerce.example` to `.env.local`
2. Update the values with your WordPress/WooCommerce credentials
3. Test the connection using the provided test scripts

## WooGraphQL Cart API Configuration

### Cart API Changes

In the latest versions of WooGraphQL, the cart API has undergone significant changes. The key differences are:

1. **Session-Based Cart Management**:
   - WooGraphQL now handles carts via user sessions instead of passing cart IDs
   - The cart is automatically associated with the current user session
   - This improves security and simplifies cart management

2. **GraphQL Query Updates**:
   - The `cart` query no longer accepts an `id` or `key` parameter
   - Simply use `query { cart { ... } }` without parameters
   - The API will return the cart associated with the current session

3. **Cart Mutation Updates**:
   - `addToCart` mutations now work with the session-based cart
   - You no longer need to pass a cart ID to mutations like `addToCart` or `removeItemsFromCart`
   - Product and variation IDs are still required as before

### Required WordPress Configuration

1. **Enable WooCommerce Session Management**:
   - Note: If you do not see a "Session Management" tab in WooCommerce > Settings > Advanced, session management is likely enabled by default in recent WooCommerce versions. There may not be a dedicated UI for this setting. You can proceed to the next step, or consult the WooGraphQL and WooCommerce documentation for any advanced session configuration options.
   - Ensure "Enable Session Management" is turned on
   - Set an appropriate session expiration time (default is 48 hours)

2. **WooGraphQL Plugin Configuration**:
   - Ensure you have the latest version of WPGraphQL for WooCommerce (WooGraphQL) installed and activated.
   - In your WordPress admin, navigate to **GraphQL > Settings > WooCommerce**.
   - **Do NOT check "Disable GQL Session Handler"** (leave this unchecked).
   - **Leave "Enable GQL Session Handler on WC AJAX requests" and "Enable GQL Session Handler on WP REST requests" unchecked** unless you have a specific use case for AJAX or REST integration.
   - The default session management for GraphQL requests is enabled when "Disable GQL Session Handler" is unchecked.
   - You do **not** need to enable "Enable Unsupported Sync" for standard WooGraphQL cart/session usage.
   - For "Enable User Session Translating URLs", you can leave all options unchecked unless you require custom session URL handling.
   - **Summary:**  
     - Only ensure that "Disable GQL Session Handler" is **unchecked**.  
     - All other options can remain unchecked for typical WooGraphQL cart/session management.
   - Adjust permission settings for cart operations as needed for your site's security requirements.

   > Refer to the screenshot above for the recommended settings:  
   > - "Disable GQL Session Handler" should be **unchecked** (default).  
   > - All other checkboxes can remain **unchecked** unless you have advanced needs.

3. **JWT Authentication Setup**:
   - JWT authentication is essential for maintaining session state
   - Verify the JWT configuration in wp-config.php is correct:
   ```php
   define('GRAPHQL_JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
   ```
   - Ensure your frontend application is correctly handling JWT tokens in GraphQL requests

4. **Testing Cart Functionality**:
   - Use the GraphQL playground at `https://your-wordpress-site.com/graphql` to test cart operations
   - Test the basic cart queries without parameters
   - Verify that cart state persists between requests

### Working GraphQL Queries for Cart Operations

Here are examples of GraphQL queries that work with the current WooGraphQL API:

#### Get Cart

```graphql
query GetCart {
  cart {
    contents {
      nodes {
        key
        product {
          node {
            id
            name
            slug
            image {
              sourceUrl
              altText
            }
          }
        }
        variation {
          node {
            id
            name
            attributes {
              nodes {
                name
                value
              }
            }
          }
        }
        quantity
        total
      }
    }
    subtotal
    total
    totalTax
    totalShipping
    isEmpty
    contentsCount
  }
}
```

#### Add to Cart

```graphql
mutation AddToCart($input: AddToCartInput!) {
  addToCart(input: $input) {
    cart {
      contents {
        nodes {
          key
          product {
            node {
              id
              name
            }
          }
          quantity
          total
        }
      }
      subtotal
      total
    }
  }
}

# Variables:
{
  "input": {
    "clientMutationId": "add_to_cart_123",
    "items": [
      {
        "productId": 123,  # Replace with actual product ID
        "quantity": 1,
        "variationId": 456  # Optional, include only for variable products
      }
    ]
  }
}
```

#### Update Cart Items

```graphql
mutation UpdateCartItems($input: UpdateItemQuantitiesInput!) {
  updateItemQuantities(input: $input) {
    cart {
      contents {
        nodes {
          key
          product {
            node {
              name
            }
          }
          quantity
          total
        }
      }
      subtotal
      total
    }
  }
}

# Variables:
{
  "input": {
    "clientMutationId": "update_cart_123",
    "items": [
      {
        "key": "item_key_123",  # Replace with actual item key from cart
        "quantity": 2
      }
    ]
  }
}
```

#### Remove Items from Cart

```graphql
mutation RemoveItemsFromCart($keys: [ID]!, $all: Boolean) {
  removeItemsFromCart(input: { keys: $keys, all: $all }) {
    cart {
      contents {
        nodes {
          key
          product {
            node {
              name
            }
          }
          quantity
        }
      }
      subtotal
      total
      isEmpty
    }
  }
}

# Variables:
{
  "keys": ["item_key_123"],  # Replace with actual item key from cart
  "all": false  # Set to true to clear entire cart
}
```

### Troubleshooting Cart Issues

1. **"Unknown argument key/id on field cart"**:
   - This error indicates you're using old query syntax with a newer WooGraphQL version
   - Update your queries to remove the `id` or `key` parameter from cart queries

2. **"Woo session transaction executed out of order"**:
   - This error can occur if multiple session operations are executed simultaneously
   - Implement proper request queuing in your frontend application
   - Ensure you're not making multiple concurrent cart modifications

3. **Cart Items Not Persisting**:
   - Check that cookies are properly handled in your browser
   - Verify that your GraphQL client is sending the session cookie with each request
   - Test in an incognito/private browser window to rule out cookie issues

4. **"GraphQL Request must include at least one of those two parameters: \"query\" or \"queryId\""**:
   - This error occurs when accessing the GraphQL endpoint directly without providing a query
   - Always include a valid GraphQL query in your requests
   - Use a proper GraphQL client like Altair, GraphiQL, or Apollo Client that formats requests correctly

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify CORS headers are properly configured
   - Check that the Origin header is being sent from your frontend

2. **Authentication Failures**
   - Ensure JWT secret is properly set in wp-config.php
   - Check that tokens are being stored and sent correctly

3. **GraphQL Errors**
   - Check plugin versions for compatibility
   - Verify that all required plugins are active

4. **Performance Issues**
   - Implement Redis caching
   - Consider a CDN for media files
   - Use persistent object caching

## Maintenance

1. **Regular Updates**
   - Keep WordPress, WooCommerce, and all plugins updated
   - Test updates in a staging environment first

2. **Monitoring**
   - Set up uptime monitoring for the WordPress site
   - Implement error logging and alerts

3. **Backups**
   - Configure daily backups of WordPress database and files
   - Test backup restoration periodically

## Migration Validation

After setting up WooCommerce and importing products, run the migration validation script:

```bash
npm run validate-woo-migration
```

This will verify that:
1. All products were migrated correctly
2. Product data is accessible via GraphQL
3. Authentication is working properly
4. Cart operations function as expected 