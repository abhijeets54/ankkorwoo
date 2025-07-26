# WooCommerce Migration Guide for Ankkor

This guide provides comprehensive instructions for migrating your Ankkor e-commerce frontend from Shopify to a headless WooCommerce backend. This guide is especially tailored for developers who have not worked with WordPress or WooCommerce before.

## Table of Contents

1. [Backend Setup](#1-backend-setup)
2. [API Integration Layer](#2-api-integration-layer)
3. [Frontend Implementation](#3-frontend-implementation)
4. [Testing & Validation](#4-testing--validation)
5. [Deployment](#5-deployment)
6. [Post-Migration Tasks](#6-post-migration-tasks)
7. [Connecting Next.js Frontend to WooCommerce](#7-connecting-nextjs-frontend-to-woocommerce)

## 1. Backend Setup

### WordPress & WooCommerce Installation

1. **Choose a WordPress Hosting Provider**
   - Recommended: WP Engine, Kinsta, or SiteGround (optimized for WooCommerce)
   - Requirements: PHP 7.4+, MySQL 5.7+, HTTPS support
   - Budget: $30-100/month depending on traffic expectations

2. **Install WordPress**
   - Most hosts offer one-click WordPress installation
   - If manual installation is required:
     - Download WordPress from wordpress.org
     - Create a MySQL database and user
     - Upload WordPress files to your server
     - Run the installation wizard (navigate to your domain)
     - Complete the basic setup (site name, admin user, etc.)

3. **Install WooCommerce Plugin**
   - Log in to WordPress admin (yourdomain.com/wp-admin)
   - Navigate to Plugins > Add New
   - Search for "WooCommerce"
   - Click "Install Now" then "Activate"
   - Follow the setup wizard (you can skip most settings as you'll configure them later)
   - Important: When asked about theme, choose a simple theme as we'll be using headless mode

4. **Install Required GraphQL Plugins**
   - **WPGraphQL**:
     - **Download the correct file:**  
       - Go to the [WPGraphQL Releases page](https://github.com/wp-graphql/wp-graphql/releases).
       - In the "Assets" section of the latest release, download the file named `wp-graphql.zip`.  
         *Do not download "Source code (zip/tar.gz)" or any other files.*
     - In your WordPress admin, go to Plugins > Add New > Upload Plugin.
     - Upload the `wp-graphql.zip` file and activate the plugin.
     - **If you cloned WPGraphQL from GitHub instead of using the release ZIP:**  
       - You must install dependencies before activating the plugin.
       - Connect to your server or local environment, navigate to the `wp-graphql` plugin directory, and run `composer install`.
       - After installing dependencies, activate the plugin in WordPress admin.
     - **Troubleshooting:**  
       - If you see an error like "WPGraphQL appears to have been installed without its dependencies," it means you need to run `composer install` in the plugin directory or use the official release ZIP as described above.
   
   - **WooGraphQL (WPGraphQL for WooCommerce)**:
     - Download from [GitHub Releases](https://github.com/wp-graphql/wp-graphql-woocommerce/releases)
     - Upload and activate as above
     - Note: Make sure you're using version 0.12.0+ to avoid cart undefined errors

   - **WPGraphQL-JWT-Authentication**:
     - **Download the correct file:**  
       - Go to the [WPGraphQL-JWT-Authentication Releases page](https://github.com/wp-graphql/wp-graphql-jwt-authentication/releases).
       - In the "Assets" section of the latest release, you will only see "Source code (zip)" and "Source code (tar.gz)"—there is no pre-built plugin ZIP file.
       - **Do NOT upload the "Source code" ZIP directly to WordPress.** It will not work as a plugin.
     - **How to install:**
       1. Download the "Source code (zip)" file from the release.
       2. Extract the ZIP file to a folder on your computer.
       3. Rename the extracted folder to `wp-graphql-jwt-authentication`.
       4. (Optional but recommended) Open a terminal, navigate to the extracted folder, and run `composer install` to install PHP dependencies.  
          - If you do not have Composer installed, see [Composer installation instructions](https://getcomposer.org/download/).
       5. Compress the `wp-graphql-jwt-authentication` folder back into a ZIP file.
       6. In your WordPress admin, go to Plugins > Add New > Upload Plugin.
       7. Upload your newly created ZIP file and activate the plugin.
     - **Troubleshooting:**  
       - If you see an error like "The plugin does not have a valid header" or "missing dependencies," ensure you have run `composer install` and zipped the correct folder.

5. **Install Additional Recommended Plugins**

   - **Redis Object Cache (Recommended for Performance)**
     - **Is this plugin compulsory?**
       - No, it is not strictly required for your headless site to function. Your GraphQL API will work without it.
       - However, for a production e-commerce site, a persistent object cache is **strongly recommended**. Without it, every API request will hit your WordPress database directly, which can lead to slow response times and server overload, especially under traffic.
     - **What does it do?**
       - It dramatically improves performance by storing the results of database queries in Redis, a very fast in-memory data store. This means when you fetch a product or a category multiple times, the data comes from the fast cache instead of a slow database query.
     - **Alternatives if you cannot use Redis:**
       - If your hosting provider doesn't support Redis, you have other options. Check with your host first, as they may offer a preferred caching solution.
       - **1. Memcached Object Cache:**
         - **What it is:** Memcached is a high-performance, distributed memory object caching system. Like Redis, it speeds up your WordPress backend by storing the results of common database queries in your server's fast RAM, reducing the load on the database and speeding up API response times.
         - **When to use it:** It's an excellent alternative if your hosting provider supports Memcached but not Redis. Using Memcached is significantly better for performance than having no object cache at all.
         - **How it works:**
           1. **Confirm with Host:** First, verify with your hosting provider that a Memcached server is active for your account and get the connection details (IP/socket and port).
           2. **Install Plugin:** Install a plugin like [Memcached Object Cache](https://wordpress.org/plugins/memcached/).
           3. **Install the Drop-in File:** This type of plugin requires a "drop-in". You must manually copy the `object-cache.php` file from the plugin's directory (e.g., `/wp-content/plugins/memcached/`) to your `/wp-content/` directory. The plugin cannot do this for you.
           4. **Configure `wp-config.php`:** You may need to add the server details to your `wp-config.php` file to tell WordPress how to connect. Check the plugin's documentation for the exact code, which will look similar to this:
              ```php
              global $memcached_servers;
              $memcached_servers = array(
                  'default' => array('127.0.0.1:11211')
              );
              ```
       - **2. Hosting Provider's Built-in Caching:**
         - Many managed WordPress hosts (like Kinsta, WP Engine, SiteGround, Cloudways) provide their own server-level caching solutions that often include an object cache.
         - This is often the best alternative. Check your hosting panel or contact their support to enable their object caching feature. It's usually optimized for their environment.
       - **3. Other Caching Plugins:**
         - Plugins like [W3 Total Cache](https://wordpress.org/plugins/w3-total-cache/) offer object caching modules that can be configured to use Memcached or even disk-based caching as a last resort.
         - If you use one of these, ensure you **only enable the Object Cache** feature. Page Caching, Minification, and other features should be disabled, as they are handled by your Next.js frontend.

   - **WP Headless** (optional, disables default WordPress frontend)  
     - Go to Plugins > Add New.
     - Search for "WP Headless" by Benjamin Pick.
     - Click "Install Now" and "Activate".
     - [Plugin page](https://wordpress.org/plugins/wp-headless/)

   - **Yoast SEO**  
     - Go to Plugins > Add New.
     - Search for "Yoast SEO" by Team Yoast.
     - Click "Install Now" and "Activate".
     - [Plugin page](https://wordpress.org/plugins/wordpress-seo/)

   - **WP REST API Controller** (optional, for REST API fine-tuning)  
     - Go to Plugins > Add New.
     - Search for "WP REST API Controller" by YIKES, Inc.
     - Click "Install Now" and "Activate".
     - [Plugin page](https://wordpress.org/plugins/wp-rest-api-controller/)

6. **Configure WordPress Settings**
   - **Update Permalinks** (CRITICAL STEP):
     - Go to Settings > Permalinks
     - Select "Post name" structure (e.g., `/sample-post/`)
     - Save changes
     - This step is essential for proper API functionality

7. **Set Up CORS Support**
   - You have two options:
     
     **Option 1**: Use a plugin like "CORS Enabler"
     - Install and activate from WordPress plugin directory
     - Configure allowed origins (your Next.js domain)
     
     **Option 2**: Add CORS headers manually
     - Access your server configuration files
     - For Apache, add to `.htaccess`:
     ```apache
     <IfModule mod_headers.c>
       Header set Access-Control-Allow-Origin "https://your-frontend-domain.com"
       Header set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
       Header set Access-Control-Allow-Credentials "true"
       Header set Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce"
     </IfModule>
     ```
     
     - For Nginx, add to server block:
     ```nginx
     add_header Access-Control-Allow-Origin "https://your-frontend-domain.com";
     add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
     add_header Access-Control-Allow-Credentials "true";
     add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce";
     ```

8. **JWT Authentication Setup**
   - Access your WordPress server files
   - Locate or create `wp-config.php` (in the WordPress root directory)
   - Add this line before "That's all, stop editing!" comment:
   ```php
   define('GRAPHQL_JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
   ```
   - Generate a secure key using: https://api.wordpress.org/secret-key/1.1/salt/
   - Copy one of the generated keys and replace 'your-secret-key-here'
   - Save the file

### WooCommerce Configuration

1. **General Settings**
   - Go to WooCommerce > Settings
   - **General tab**:
     - Set store address (important for shipping/tax calculations)
     - Configure currency options
     - Set selling location(s) and shipping location(s)
   
   - **Products tab**:
     - Configure measurement units
     - Set up product ratings
     - Configure inventory settings (enable stock management)
   
   - **Tax tab**:
     - Configure tax calculations based on your requirements
     - Set up tax classes if needed
     - Create tax rates for different regions

2. **Payment Setup**
   - Go to WooCommerce > Settings > Payments
   - Enable and configure payment gateways:
     - **Stripe**: Install "WooCommerce Stripe Gateway" plugin
       - Get API keys from Stripe Dashboard
       - Configure webhook endpoints
     - **PayPal**: Enable and configure with your PayPal business email
     - **Cash on Delivery**: Enable for testing purposes
   - For each gateway, enter test credentials first for development

3. **Shipping Configuration**
   - Go to WooCommerce > Settings > Shipping
   - Create shipping zones (geographical regions)
   - For each zone, add shipping methods:
     - Flat rate
     - Free shipping
     - Local pickup
   - Configure shipping classes for different product types
   - Important: Add a shipping method to "Locations not covered by your other zones"

4. **Email Settings**
   - Go to WooCommerce > Settings > Emails
   - Configure sender email and name
   - Customize email templates if needed
   - Enable/disable specific notification emails

5. **Account Settings**
   - Go to WooCommerce > Settings > Accounts & Privacy
   - Enable customer account creation
   - Configure privacy policy settings
   - Set up guest checkout options

6. **Product Import from Shopify**
   - **Export from Shopify**:
     - Go to Shopify Admin > Products > Export
     - Select "All products" and CSV format
     - Save the file
   
   - **Format for WooCommerce**:
     - You may need to adjust column names to match WooCommerce format
     - Consider using a tool like WP All Import with the WooCommerce add-on
   
   - **Import to WooCommerce**:
     - Go to WooCommerce > Products > Import
     - Upload your CSV file
     - Map the columns to WooCommerce fields
     - Run the import
     - Verify products after import

7. **Product Attributes and Variations**
   - Go to Products > Attributes
   - Create attributes like Size, Color, etc.
   - Add terms to each attribute (S, M, L for Size; Red, Blue, Black for Color)
   - For variable products:
     - Edit the product
     - Go to the "Attributes" tab
     - Add attributes and check "Used for variations"
     - Go to the "Variations" tab
     - Create variations based on attributes
     - Set prices, SKUs, and stock for each variation

8. **Configure API Access**
   - Go to WooCommerce > Settings > Advanced > REST API
   - Click "Add Key"
   - Enter a description (e.g., "Ankkor Frontend")
   - Set User to your admin account
   - Set Permissions to "Read/Write"
   - Generate API key
   - Save the Consumer Key and Consumer Secret for your Next.js application

9. **Configure Webhooks**
   - Go to WooCommerce > Settings > Advanced > Webhooks
   - Create webhooks for these topics:
     - Product created/updated
     - Order created/updated
     - Inventory updated
   - Set delivery URLs to your Next.js API routes:
     - `https://your-frontend-domain.com/api/webhooks/products`
     - `https://your-frontend-domain.com/api/webhooks/orders`
     - `https://your-frontend-domain.com/api/webhooks/inventory`
   - Set Secret to a secure value (store this in your Next.js environment variables)
   - Choose the latest API version
   - Set status to "Active"

10. **Test GraphQL Endpoint**
    - Visit `https://your-wordpress-site.com/graphql` in your browser
    - You should see the GraphQL IDE or a JSON response
    - Try a simple query:
    ```graphql
    {
      products(first: 5) {
        nodes {
          id
          name
          price
        }
      }
    }
    ```
    - Verify that product data is returned correctly

## 2. API Integration Layer

### GraphQL Integration

1. **Set Up Environment Variables**
   - Create or update `.env.local` with:
   ```
   NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
   WOOCOMMERCE_GRAPHQL_URL=https://your-wordpress-site.com/graphql
   WOOCOMMERCE_JWT_SECRET=your-jwt-secret
   WOOCOMMERCE_CONSUMER_KEY=your-consumer-key
   WOOCOMMERCE_CONSUMER_SECRET=your-consumer-secret
   ```

2. **Create GraphQL Client**
   - Create `src/lib/woocommerce.ts`:
   ```typescript
   import { GraphQLClient } from 'graphql-request';
   
   const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';
   
   export const graphqlClient = new GraphQLClient(endpoint, {
     headers: {
       authorization: process.env.WOOCOMMERCE_JWT_TOKEN ? `Bearer ${process.env.WOOCOMMERCE_JWT_TOKEN}` : '',
     },
   });
   ```

3. **Define GraphQL Queries and Mutations**
   - Add product queries:
   ```typescript
   export const GET_PRODUCTS = `
     query GetProducts($first: Int, $after: String, $where: RootQueryToProductConnectionWhereArgs) {
       products(first: $first, after: $after, where: $where) {
         pageInfo {
           hasNextPage
           endCursor
         }
         nodes {
           id
           databaseId
           name
           slug
           description
           shortDescription
           price
           regularPrice
           salePrice
           onSale
           image {
             sourceUrl
             altText
           }
           galleryImages {
             nodes {
               sourceUrl
               altText
             }
           }
           productCategories {
             nodes {
               name
               slug
             }
           }
           attributes {
             nodes {
               name
               options
             }
           }
         }
       }
     }
   `;
   ```
   
   - Add cart mutations:
   ```typescript
   export const ADD_TO_CART = `
     mutation AddToCart($productId: Int!, $quantity: Int!) {
       addToCart(input: {productId: $productId, quantity: $quantity}) {
         cart {
           contents {
             nodes {
               key
               product {
                 node {
                   id
                   name
                   price
                 }
               }
               quantity
               subtotal
               total
             }
           }
           subtotal
           total
         }
       }
     }
   `;
   ```

4. **Create API Functions**
   - Add product fetching:
   ```typescript
   export async function getAllProducts(first = 12, after = null, filters = {}) {
     try {
       const response = await graphqlClient.request(GET_PRODUCTS, {
         first,
         after,
         where: filters,
       });
       return response.products;
     } catch (error) {
       console.error('Error fetching products:', error);
       return { nodes: [] };
     }
   }
   ```
   
   - Add cart functions:
   ```typescript
   export async function addToCart(productId, quantity = 1) {
     try {
       const response = await graphqlClient.request(ADD_TO_CART, {
         productId,
         quantity,
       });
       return response.addToCart.cart;
     } catch (error) {
       console.error('Error adding to cart:', error);
       throw error;
     }
   }
   ```

5. **Data Normalization**
   - Create functions to normalize WooCommerce data to match your existing Shopify structure:
   ```typescript
   export function normalizeProduct(product) {
     return {
       id: product.databaseId,
       handle: product.slug,
       title: product.name,
       description: product.description,
       price: product.price,
       images: product.galleryImages?.nodes.map(img => ({
         src: img.sourceUrl,
         alt: img.altText,
       })) || [],
       variants: [], // Map variants if applicable
       // Add other fields as needed
     };
   }
   ```

### State Management with Zustand

1. **Create Cart Store**
   - Create `src/lib/wooStore.ts`:
   ```typescript
   import create from 'zustand';
   import { persist } from 'zustand/middleware';
   import { addToCart, updateCartItem, removeCartItem, getCart } from './woocommerce';
   
   interface CartState {
     items: any[];
     isOpen: boolean;
     loading: boolean;
     total: string;
     subtotal: string;
     itemCount: number;
     
     openCart: () => void;
     closeCart: () => void;
     addItem: (productId: number, quantity: number) => Promise<void>;
     updateItem: (key: string, quantity: number) => Promise<void>;
     removeItem: (key: string) => Promise<void>;
     loadCart: () => Promise<void>;
     clearCart: () => void;
   }
   
   export const useCartStore = create<CartState>()(
     persist(
       (set, get) => ({
         items: [],
         isOpen: false,
         loading: false,
         total: '0.00',
         subtotal: '0.00',
         itemCount: 0,
         
         openCart: () => set({ isOpen: true }),
         closeCart: () => set({ isOpen: false }),
         
         addItem: async (productId, quantity) => {
           set({ loading: true });
           try {
             const cart = await addToCart(productId, quantity);
             set({
               items: cart.contents.nodes,
               total: cart.total,
               subtotal: cart.subtotal,
               itemCount: cart.contents.nodes.reduce((sum, item) => sum + item.quantity, 0),
               loading: false,
             });
           } catch (error) {
             console.error('Error adding item to cart:', error);
             set({ loading: false });
           }
         },
         
         // Implement other methods (updateItem, removeItem, loadCart, clearCart)
       }),
       {
         name: 'ankkor-cart',
         getStorage: () => localStorage,
       }
     )
   );
   ```

## 3. Frontend Implementation

### Product Display Components

1. **Product Listing Page**
   - Update your existing product listing components to fetch from WooCommerce:
   ```typescript
   import { getAllProducts, normalizeProduct } from '@/lib/woocommerce';
   
   export async function getStaticProps() {
     const products = await getAllProducts(12);
     
     return {
       props: {
         products: products.nodes.map(normalizeProduct),
       },
       revalidate: 60, // ISR - revalidate every 60 seconds
     };
   }
   ```

2. **Product Detail Page**
   - Update to fetch product details from WooCommerce:
   ```typescript
   import { getProductBySlug, normalizeProduct } from '@/lib/woocommerce';
   
   export async function getStaticProps({ params }) {
     const { slug } = params;
     const product = await getProductBySlug(slug);
     
     if (!product) {
       return { notFound: true };
     }
     
     return {
       props: {
         product: normalizeProduct(product),
       },
       revalidate: 60,
     };
   }
   ```

### Cart Implementation

1. **Cart Component**
   - Update your cart component to use the WooCommerce cart store:
   ```tsx
   import { useCartStore } from '@/lib/wooStore';
   
   export function Cart() {
     const { items, total, subtotal, isOpen, closeCart, removeItem, updateItem } = useCartStore();
     
     // Render cart items, totals, etc.
     // Use removeItem and updateItem for cart operations
   }
   ```

2. **Add to Cart Button**
   - Update to use WooCommerce cart functions:
   ```tsx
   import { useCartStore } from '@/lib/wooStore';
   
   export function AddToCartButton({ product, quantity = 1 }) {
     const { addItem, openCart } = useCartStore();
     const [loading, setLoading] = useState(false);
     
     const handleAddToCart = async () => {
       setLoading(true);
       await addItem(product.id, quantity);
       setLoading(false);
       openCart();
     };
     
     return (
       <button 
         onClick={handleAddToCart}
         disabled={loading}
         className="btn-primary"
       >
         {loading ? 'Adding...' : 'Add to Cart'}
       </button>
     );
   }
   ```

### Checkout Integration

1. **Custom Checkout Flow**
   - Create a checkout page that collects customer information:
   ```tsx
   import { useState } from 'react';
   import { useCartStore } from '@/lib/wooStore';
   import { createOrder } from '@/lib/woocommerce';
   
   export default function Checkout() {
     const { items, total } = useCartStore();
     const [formData, setFormData] = useState({
       firstName: '',
       lastName: '',
       email: '',
       // Add other fields
     });
     
     const handleSubmit = async (e) => {
       e.preventDefault();
       
       // Create order via API
       const order = await createOrder({
         billing: {
           first_name: formData.firstName,
           last_name: formData.lastName,
           email: formData.email,
           // Add other fields
         },
         // Add shipping, payment method, etc.
       });
       
       // Redirect to payment gateway or confirmation
       window.location.href = order.paymentUrl;
     };
     
     // Render checkout form
   }
   ```

2. **Payment Integration**
   - Create API route for payment processing:
   ```typescript
   // src/app/api/checkout/route.ts
   import { NextResponse } from 'next/server';
   import Stripe from 'stripe';
   
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
   
   export async function POST(request: Request) {
     const body = await request.json();
     
     try {
       // Create Stripe payment intent
       const paymentIntent = await stripe.paymentIntents.create({
         amount: Math.round(parseFloat(body.total) * 100),
         currency: 'inr',
         metadata: {
           order_id: body.orderId,
         },
       });
       
       return NextResponse.json({ 
         clientSecret: paymentIntent.client_secret 
       });
     } catch (error) {
       console.error('Payment error:', error);
       return NextResponse.json(
         { error: 'Payment failed' },
         { status: 500 }
       );
     }
   }
   ```

### User Authentication

1. **JWT Authentication**
   - Create authentication functions:
   ```typescript
   export async function loginUser(username, password) {
     try {
       const response = await graphqlClient.request(LOGIN_MUTATION, {
         username,
         password,
       });
       
       const { authToken, refreshToken } = response.login;
       
       // Store tokens
       localStorage.setItem('woocommerce_auth_token', authToken);
       localStorage.setItem('woocommerce_refresh_token', refreshToken);
       
       // Update GraphQL client headers
       graphqlClient.setHeader('Authorization', `Bearer ${authToken}`);
       
       return response.login.user;
     } catch (error) {
       console.error('Login error:', error);
       throw error;
     }
   }
   ```

2. **User Account Pages**
   - Create account dashboard components that fetch user data and orders

## 4. Testing & Validation

### Functional Testing

1. **Test API Integration**
   - Create a test page to verify WooCommerce API connectivity:
   ```tsx
   // src/app/woocommerce-test/page.tsx
   import { getAllProducts } from '@/lib/woocommerce';
   
   export default async function WooCommerceTest() {
     const products = await getAllProducts(5);
     
     return (
       <div>
         <h1>WooCommerce API Test</h1>
         <pre>{JSON.stringify(products, null, 2)}</pre>
       </div>
     );
   }
   ```

2. **Test User Flows**
   - Systematically test:
     - Product browsing and filtering
     - Adding items to cart
     - Checkout process
     - User registration and login
     - Order history viewing

### Performance Testing

1. **Core Web Vitals**
   - Use Lighthouse to measure performance metrics
   - Optimize based on results

2. **API Response Time**
   - Monitor GraphQL query performance
   - Implement caching for frequently accessed data

## 5. Deployment

### Pre-Deployment Checklist

1. **Environment Configuration**
   - Update all environment variables for production
   - Switch payment gateways from test to live mode

2. **SSL Configuration**
   - Ensure both WordPress and Next.js sites have valid SSL certificates
   - Update CORS settings to use HTTPS URLs

3. **Final Testing**
   - Perform end-to-end testing in staging environment
   - Test payment processing with real cards (in test mode)

### Deployment Steps

1. **Deploy WordPress/WooCommerce**
   - Ensure proper server configuration
   - Set up caching (Redis, page caching)
   - Configure security measures (firewall, login protection)

2. **Deploy Next.js Frontend**
   - Deploy to Vercel or your preferred hosting
   - Configure environment variables
   - Set up proper build settings (Node.js version, etc.)

3. **Post-Deployment Verification**
   - Verify all API connections work in production
   - Test complete user flows from browsing to checkout
   - Monitor for errors in logs

## 6. Post-Migration Tasks

### Data Synchronization

1. **Set Up Redis for Caching**
   - Install and configure Redis on your WordPress server
   - Install Redis Object Cache plugin
   - Configure connection settings

2. **Configure QStash for Background Jobs**
   - Set up QStash for scheduled tasks:
   ```typescript
   // src/lib/wooQstash.ts
   import { Client } from '@upstash/qstash';
   
   const qstash = new Client({
     token: process.env.QSTASH_TOKEN!,
   });
   
   export async function scheduleInventorySync() {
     await qstash.publishJSON({
       url: `${process.env.NEXT_PUBLIC_APP_URL}/api/sync/inventory`,
       body: { action: 'sync_inventory' },
       cron: '0 * * * *', // Every hour
     });
   }
   
   export async function scheduleProductSync() {
     await qstash.publishJSON({
       url: `${process.env.NEXT_PUBLIC_APP_URL}/api/sync/products`,
       body: { action: 'sync_products' },
       cron: '0 0 * * *', // Daily at midnight
     });
   }
   ```

3. **Create API Routes for Webhooks**
   - Implement webhook handlers:
   ```typescript
   // src/app/api/webhooks/route.ts
   import { NextResponse } from 'next/server';
   import { revalidatePath } from 'next/cache';
   
   export async function POST(request: Request) {
     const body = await request.json();
     const { type, resource } = body;
     
     // Verify webhook signature
     // Process based on webhook type
     
     if (type === 'product.updated') {
       // Revalidate product pages
       revalidatePath(`/products/${resource.slug}`);
       revalidatePath('/products');
     }
     
     return NextResponse.json({ success: true });
   }
   ```

### SEO Implementation

1. **Structured Data**
   - Add Product schema to product pages:
   ```tsx
   <script
     type="application/ld+json"
     dangerouslySetInnerHTML={{
       __html: JSON.stringify({
         '@context': 'https://schema.org',
         '@type': 'Product',
         name: product.title,
         description: product.description,
         image: product.images[0]?.src,
         offers: {
           '@type': 'Offer',
           price: product.price,
           priceCurrency: 'USD',
           availability: product.inStock
             ? 'https://schema.org/InStock'
             : 'https://schema.org/OutOfStock',
         },
       }),
     }}
   />
   ```

2. **XML Sitemaps**
   - Create dynamic sitemap generation:
   ```typescript
   // src/app/sitemap.ts
   import { getAllProducts, getAllCategories } from '@/lib/woocommerce';
   
   export default async function sitemap() {
     const products = await getAllProducts(999);
     const categories = await getAllCategories();
     
     const productUrls = products.nodes.map((product) => ({
       url: `https://yourdomain.com/products/${product.slug}`,
       lastModified: new Date(),
     }));
     
     const categoryUrls = categories.nodes.map((category) => ({
       url: `https://yourdomain.com/categories/${category.slug}`,
       lastModified: new Date(),
     }));
     
     return [
       {
         url: 'https://yourdomain.com',
         lastModified: new Date(),
       },
       ...productUrls,
       ...categoryUrls,
     ];
   }
   ```

## 7. Connecting Next.js Frontend to WooCommerce

This section provides detailed instructions for connecting your Next.js 14 frontend to a WooCommerce backend hosted on Hostinger.

### 7.1 Environment Variables Setup

First, you need to set up the necessary environment variables in your Next.js project. Create or update your `.env.local` file with the following variables:

```
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
WOOCOMMERCE_GRAPHQL_URL=https://your-wordpress-site.com/graphql
WOOCOMMERCE_CONSUMER_KEY=your-consumer-key
WOOCOMMERCE_CONSUMER_SECRET=your-consumer-secret
WOOCOMMERCE_JWT_SECRET=your-jwt-secret
WOOCOMMERCE_REVALIDATION_SECRET=your-revalidation-secret
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
QSTASH_TOKEN=your-qstash-token
```

#### How to obtain these values for Hostinger-hosted WooCommerce:

1. **Base URLs**:
   - `NEXT_PUBLIC_WORDPRESS_URL`: Your WordPress site URL (e.g., `https://ankkor-store.com`)
   - `WOOCOMMERCE_GRAPHQL_URL`: Your WordPress site URL + `/graphql` (e.g., `https://ankkor-store.com/graphql`)

2. **WooCommerce API Credentials**:
   - Log in to your WordPress admin dashboard
   - Navigate to WooCommerce → Settings → Advanced → REST API
   - Click "Add Key"
   - Enter a description (e.g., "Ankkor Next.js Frontend")
   - Set User to your admin account
   - Set Permissions to "Read/Write"
   - Click "Generate API Key"
   - Copy the Consumer Key to `WOOCOMMERCE_CONSUMER_KEY`
   - Copy the Consumer Secret to `WOOCOMMERCE_CONSUMER_SECRET`

3. **JWT Authentication Secret**:
   - Install the WPGraphQL-JWT-Authentication plugin
   - Generate a secure secret key at https://api.wordpress.org/secret-key/1.1/salt/
   - Access your Hostinger control panel
   - Use the File Manager or FTP to edit the `wp-config.php` file
   - Add the following line before the "That's all, stop editing!" comment:
     ```php
     define('GRAPHQL_JWT_AUTH_SECRET_KEY', 'your-copied-secret-key-here');
     ```
   - Use the same secret key in your `WOOCOMMERCE_JWT_SECRET` variable

4. **Revalidation Secret**:
   - Generate a random secure string (you can use a password generator or UUID generator)
   - Set this value for `WOOCOMMERCE_REVALIDATION_SECRET`
   - This will be used to secure webhook endpoints that trigger content revalidation

5. **Redis and QStash Setup**:
   - Create an account at [Upstash](https://upstash.com/)
   - Create a new Redis database
   - From your Redis database dashboard, copy the REST API URL to `UPSTASH_REDIS_REST_URL`
   - Copy the REST API token to `UPSTASH_REDIS_REST_TOKEN`
   - For QStash, go to the QStash section in your Upstash dashboard
   - Create a new project if needed
   - Copy the token to `QSTASH_TOKEN`

### 7.2 WooCommerce Backend Configuration for Hostinger

#### Permalinks Setup (Critical)

1. Login to your WordPress admin on Hostinger
2. Go to Settings → Permalinks
3. Select "Post name" option
4. Save changes

This step is absolutely essential as GraphQL and REST API won't work properly without proper permalinks.

#### CORS Configuration

For Hostinger-hosted WordPress, you need to configure CORS to allow your Next.js frontend to communicate with the WooCommerce API:

1. Install and activate a CORS plugin like "Enable CORS" or create a custom function in your theme's `functions.php` file:

```php
function add_cors_headers() {
    header("Access-Control-Allow-Origin: https://your-nextjs-domain.com");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce");
    
    if ('OPTIONS' == $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit();
    }
}
add_action('init', 'add_cors_headers');
```

2. Replace `https://your-nextjs-domain.com` with your actual Next.js frontend domain
3. If your Next.js app is in development, you might want to temporarily use `*` for the Access-Control-Allow-Origin (but remember to change it to your specific domain for production)

### 7.3 Testing the Connection

Create a simple test file in your Next.js project to verify the connection to your WooCommerce backend:

```typescript
// src/app/woocommerce-test/page.tsx
import React from 'react';

async function getProducts() {
  try {
    const response = await fetch(`${process.env.WOOCOMMERCE_GRAPHQL_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetProducts {
            products(first: 5) {
              nodes {
                id
                name
                price
                slug
              }
            }
          }
        `,
      }),
      cache: 'no-store',
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return { errors: [{ message: error.message }] };
  }
}

export default async function WooCommerceTest() {
  const data = await getProducts();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">WooCommerce API Test</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[600px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
```

Visit `http://localhost:3000/woocommerce-test` to see if you can fetch products from your WooCommerce store.

### 7.4 Creating the WooCommerce API Client

Create a WooCommerce API client to handle all your API requests:

```typescript
// src/lib/woocommerce.ts
import { GraphQLClient } from 'graphql-request';

// GraphQL client setup
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || '';

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {},
});

// Function to set auth token for authenticated requests
export const setAuthToken = (token: string) => {
  graphqlClient.setHeader('Authorization', `Bearer ${token}`);
};

// Clear auth token
export const clearAuthToken = () => {
  graphqlClient.setHeader('Authorization', '');
};

// Example query function for products
export async function getProducts(first = 12, after = null, filters = {}) {
  const query = `
    query GetProducts($first: Int, $after: String, $where: ProductsWhereArgs) {
      products(first: $first, after: $after, where: $where) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          databaseId
          name
          slug
          description
          shortDescription
          price
          regularPrice
          salePrice
          onSale
          image {
            sourceUrl
            altText
          }
          galleryImages {
            nodes {
              sourceUrl
              altText
            }
          }
          productCategories {
            nodes {
              name
              slug
            }
          }
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  `;

  try {
    const response = await graphqlClient.request(query, {
      first,
      after,
      where: filters,
    });
    return response.products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return { nodes: [] };
  }
}

// Example query function for a single product
export async function getProductBySlug(slug: string) {
  const query = `
    query GetProductBySlug($slug: ID!) {
      product(id: $slug, idType: SLUG) {
        id
        databaseId
        name
        slug
        description
        shortDescription
        price
        regularPrice
        salePrice
        onSale
        image {
          sourceUrl
          altText
        }
        galleryImages {
          nodes {
            sourceUrl
            altText
          }
        }
        productCategories {
          nodes {
            name
            slug
          }
        }
        attributes {
          nodes {
            name
            options
          }
        }
      }
    }
  `;

  try {
    const response = await graphqlClient.request(query, { slug });
    return response.product;
  } catch (error) {
    console.error(`Error fetching product with slug ${slug}:`, error);
    return null;
  }
}

// Example mutation for cart
export async function addToCart(productId: number, quantity: number = 1) {
  const mutation = `
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
                  price
                }
              }
              quantity
              subtotal
              total
            }
          }
          subtotal
          total
        }
      }
    }
  `;

  try {
    const response = await graphqlClient.request(mutation, {
      input: {
        productId,
        quantity,
      },
    });
    return response.addToCart.cart;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

// Data normalization function (optional but helpful)
export function normalizeProduct(product) {
  if (!product) return null;
  
  return {
    id: product.databaseId,
    handle: product.slug,
    title: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    price: product.price,
    regularPrice: product.regularPrice,
    salePrice: product.salePrice,
    onSale: product.onSale,
    images: product.galleryImages?.nodes.map(img => ({
      src: img.sourceUrl,
      alt: img.altText,
    })) || [],
    featuredImage: product.image ? {
      src: product.image.sourceUrl,
      alt: product.image.altText,
    } : null,
    categories: product.productCategories?.nodes.map(cat => ({
      name: cat.name,
      slug: cat.slug,
    })) || [],
    attributes: product.attributes?.nodes.map(attr => ({
      name: attr.name,
      values: attr.options,
    })) || [],
  };
}
```

### 7.5 User Authentication Implementation

To implement user authentication with JWT:

```typescript
// src/lib/wooAuth.ts
import { graphqlClient, setAuthToken, clearAuthToken } from './woocommerce';

export async function loginUser(username: string, password: string) {
  const mutation = `
    mutation LoginUser($input: LoginInput!) {
      login(input: $input) {
        authToken
        refreshToken
        user {
          id
          name
          email
        }
      }
    }
  `;

  try {
    const response = await graphqlClient.request(mutation, {
      input: {
        username,
        password,
      },
    });
    
    const { authToken, refreshToken, user } = response.login;
    
    // Store tokens in localStorage or a secure cookie
    if (typeof window !== 'undefined') {
      localStorage.setItem('woocommerce_auth_token', authToken);
      localStorage.setItem('woocommerce_refresh_token', refreshToken);
    }
    
    // Set the auth token on the GraphQL client
    setAuthToken(authToken);
    
    return { user, success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

export async function logoutUser() {
  // Clear tokens from localStorage or cookie
  if (typeof window !== 'undefined') {
    localStorage.removeItem('woocommerce_auth_token');
    localStorage.removeItem('woocommerce_refresh_token');
  }
  
  // Clear the auth token from the GraphQL client
  clearAuthToken();
  
  return { success: true };
}

export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('woocommerce_auth_token');
  }
  return null;
}

// Function to initialize auth state on app load
export function initAuth() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('woocommerce_auth_token');
    if (token) {
      setAuthToken(token);
    }
  }
}
```

### 7.6 Implementing Cart with Zustand

Since you're already using Zustand for state management, here's how to implement a cart store:

```typescript
// src/lib/wooStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addToCart as apiAddToCart } from './woocommerce';

interface CartItem {
  key: string;
  product: {
    id: number;
    name: string;
    price: string;
  };
  quantity: number;
  subtotal: string;
  total: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  loading: boolean;
  total: string;
  subtotal: string;
  itemCount: number;
  
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: number, quantity: number) => Promise<void>;
  updateItem: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  loadCart: () => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      loading: false,
      total: '0.00',
      subtotal: '0.00',
      itemCount: 0,
      
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      
      addItem: async (productId, quantity) => {
        set({ loading: true });
        try {
          const cart = await apiAddToCart(productId, quantity);
          set({
            items: cart.contents.nodes,
            total: cart.total,
            subtotal: cart.subtotal,
            itemCount: cart.contents.nodes.reduce((sum, item) => sum + item.quantity, 0),
            loading: false,
          });
        } catch (error) {
          console.error('Error adding item to cart:', error);
          set({ loading: false });
        }
      },
      
      updateItem: async (key, quantity) => {
        set({ loading: true });
        try {
          // Implement the updateItemQuantities mutation logic here
          set({ loading: false });
        } catch (error) {
          console.error('Error updating item:', error);
          set({ loading: false });
        }
      },
      
      removeItem: async (key) => {
        set({ loading: true });
        try {
          // Implement the removeItemsFromCart mutation logic here
          set({ loading: false });
        } catch (error) {
          console.error('Error removing item:', error);
          set({ loading: false });
        }
      },
      
      loadCart: async () => {
        set({ loading: true });
        try {
          // Implement the getCart query logic here
          set({ loading: false });
        } catch (error) {
          console.error('Error loading cart:', error);
          set({ loading: false });
        }
      },
      
      clearCart: () => {
        set({
          items: [],
          total: '0.00',
          subtotal: '0.00',
          itemCount: 0,
        });
      },
    }),
    {
      name: 'ankkor-cart',
      getStorage: () => (typeof window !== 'undefined' ? localStorage : null),
    }
  )
);
```

### 7.7 Hostinger-Specific Configuration

Hostinger's WordPress hosting has some specific considerations:

1. **PHP Memory Limits**: You might need to increase PHP memory limits for WooCommerce and GraphQL to work properly. Create a `php.ini` file in your site's root directory with:
   ```
   memory_limit = 256M
   max_execution_time = 300
   upload_max_filesize = 64M
   post_max_size = 64M
   ```

2. **WP-Cron for Scheduled Tasks**: Hostinger uses WordPress's default WP-Cron system. For better reliability with data synchronization, consider disabling WP-Cron and setting up a real cron job:
   
   Add to wp-config.php:
   ```php
   define('DISABLE_WP_CRON', true);
   ```
   
   Then set up a cron job in Hostinger's control panel to hit `https://your-site.com/wp-cron.php?doing_wp_cron` every 15 minutes.

3. **Redis Object Cache**: If your Hostinger plan supports Redis, enable it through their control panel and install the Redis Object Cache plugin in WordPress.

### 7.8 Next.js API Routes for WooCommerce Integration

Create API routes in your Next.js application to interact with WooCommerce securely:

```typescript
// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(body.total) * 100),
      currency: 'inr',
      metadata: {
        order_id: body.orderId,
      },
    });
    
    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret 
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: 'Payment failed' },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/webhooks/products/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const body = await request.json();
  
  // Verify the webhook signature (security check)
  const signature = request.headers.get('x-wc-webhook-signature');
  // Implement signature verification logic here
  
  try {
    // Handle product update webhook
    const productId = body.id;
    const productSlug = body.slug;
    
    // Revalidate product page
    revalidatePath(`/product/${productSlug}`);
    // Revalidate product listings
    revalidatePath('/products');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

### 7.9 Troubleshooting Common Issues

#### CORS Issues
If you encounter CORS errors:
1. Verify your CORS headers are correctly set in WordPress
2. Check that you're using the correct domain in the Access-Control-Allow-Origin header
3. For development, try temporarily setting Access-Control-Allow-Origin to "*"
4. Ensure all necessary headers are allowed (Authorization, Content-Type)

#### Authentication Issues
If JWT authentication isn't working:
1. Confirm the WPGraphQL-JWT-Authentication plugin is activated
2. Verify the GRAPHQL_JWT_AUTH_SECRET_KEY is correctly set in wp-config.php
3. Check that you're passing the token correctly in the Authorization header

#### API Connection Issues
If you can't connect to the WooCommerce API:
1. Verify your API credentials (Consumer Key and Secret)
2. Check that permalinks are set to "Post name" in WordPress
3. Temporarily deactivate security plugins or firewalls that might be blocking API requests
4. Check Hostinger's PHP version (should be 7.4+ for WPGraphQL)

#### GraphQL Schema Issues
If GraphQL queries are failing:
1. Visit the GraphQL endpoint in your browser (`https://your-site.com/graphql`) to check if it's accessible
2. Use a tool like GraphiQL to test your queries before implementing them in your code
3. Check that WooGraphQL is properly activated and compatible with your WooCommerce version

### 7.10 Performance Optimization for Hostinger

For optimal performance with your Hostinger-hosted WooCommerce site:

1. **Enable WordPress Caching**: Activate Hostinger's LiteSpeed Cache plugin for better performance

2. **Implement Redis Caching**: If your plan supports it, use Redis for object caching

3. **Use CDN for Media**: Configure a CDN for serving images and other media files

4. **Optimize Images**: Use the WebP format and proper sizes for product images

5. **Implement Query Caching in Next.js**: Cache expensive GraphQL queries using React Query or SWR

6. **Utilize Next.js Static Generation**: Use getStaticProps and getStaticPaths with ISR (Incremental Static Regeneration) for product pages to reduce server load and improve performance

## Appendix: Key Files

1. **API Integration**
   - `src/lib/woocommerce.ts`: WooCommerce GraphQL integration
   - `src/lib/wooStore.ts`: Cart state management with Zustand
   - `src/lib/wooAuth.ts`: Authentication functions
   - `src/lib/wooQstash.ts`: Background jobs configuration

2. **Components**
   - `src/components/cart/Cart.tsx`: Cart drawer component
   - `src/components/product/ProductCard.tsx`: Product display component
   - `src/components/checkout/CheckoutForm.tsx`: Checkout form

3. **API Routes**
   - `src/app/api/checkout/route.ts`: Checkout processing
   - `src/app/api/webhooks/route.ts`: Webhook handlers
   - `src/app/api/sync/route.ts`: Data synchronization endpoints

## Resources

- [WooCommerce Documentation](https://woocommerce.com/documentation/)
- [WPGraphQL Documentation](https://www.wpgraphql.com/docs/)
- [WooGraphQL Documentation](https://woographql.com/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe Documentation](https://stripe.com/docs/)
- [PayPal Documentation](https://developer.paypal.com/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [QStash Documentation](https://docs.upstash.com/qstash) 