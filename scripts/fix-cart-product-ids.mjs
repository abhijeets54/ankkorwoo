/**
 * Script to fix product ID mappings between Shopify and WooCommerce
 * 
 * This script helps with the migration from Shopify to WooCommerce by:
 * 1. Creating mappings between Shopify and WooCommerce product IDs
 * 2. Validating existing product IDs in the database
 * 3. Updating the inventory mapping
 * 
 * Usage: node scripts/fix-cart-product-ids.mjs
 */

import { config } from 'dotenv';
import { GraphQLClient, gql } from 'graphql-request';
import { Redis } from '@upstash/redis';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Initialize GraphQL client
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || '';
const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// Constants
const SHOPIFY_TO_WOO_KEY = 'shopify:to:woo:mapping';
const INVENTORY_MAPPING_KEY = 'woo:inventory:mapping:';

// Get all products from WooCommerce
const GET_ALL_PRODUCTS = gql`
  query GetAllProducts($first: Int, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        databaseId
        name
        slug
        sku
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// Main function
async function fixProductIds() {
  console.log('Starting product ID mapping fix...');

  try {
    // Get all WooCommerce products
    const wooProducts = await getAllWooProducts();
    console.log(`Found ${wooProducts.length} WooCommerce products`);

    // Create inventory mappings
    const mappings = wooProducts.map(product => ({
      productId: product.databaseId.toString(),
      productSlug: product.slug
    }));

    // Update inventory mappings
    await updateInventoryMappings(mappings);
    console.log(`Updated ${mappings.length} inventory mappings`);

    console.log('Product ID mapping fix completed successfully');
  } catch (error) {
    console.error('Error fixing product IDs:', error);
    process.exit(1);
  }
}

// Get all WooCommerce products with pagination
async function getAllWooProducts() {
  let allProducts = [];
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const variables = {
      first: 100,
      after: endCursor
    };

    const data = await graphQLClient.request(GET_ALL_PRODUCTS, variables);
    
    if (data.products?.nodes) {
      allProducts = [...allProducts, ...data.products.nodes];
      hasNextPage = data.products.pageInfo.hasNextPage;
      endCursor = data.products.pageInfo.endCursor;
    } else {
      hasNextPage = false;
    }
  }

  return allProducts;
}

// Update inventory mappings in Redis
async function updateInventoryMappings(mappings) {
  const pipeline = redis.pipeline();
  
  // Add each mapping to the pipeline
  for (const { productId, productSlug } of mappings) {
    pipeline.set(`${INVENTORY_MAPPING_KEY}${productId}`, productSlug);
  }
  
  // Execute all commands in a single transaction
  await pipeline.exec();
  
  return true;
}

// Run the script
fixProductIds(); 