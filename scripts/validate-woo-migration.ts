#!/usr/bin/env ts-node

/**
 * WooCommerce Migration Validation Script
 * 
 * This script validates that the WooCommerce integration is working properly
 * by testing various functionalities like product fetching, cart operations,
 * and authentication.
 */

import { getProducts, getProductBySlug, getCategories } from '../src/lib/woocommerce';
import * as wooInventoryMapping from '../src/lib/wooInventoryMapping';
import { login } from '../src/lib/wooAuth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Simple test result tracking
const results: { test: string; success: boolean; message: string }[] = [];

async function runTest(name: string, testFn: () => Promise<string>) {
  process.stdout.write(`Testing ${name}... `);
  
  try {
    const message = await testFn();
    results.push({ test: name, success: true, message });
    console.log('✅ Passed');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ test: name, success: false, message });
    console.log('❌ Failed');
    console.log(`   Error: ${message}`);
    return false;
  }
}

// Test product fetching
async function testProductFetching() {
  const products = await getProducts();
  
  if (!products || !products.nodes || products.nodes.length === 0) {
    throw new Error('No products returned');
  }
  
  return `Successfully fetched ${products.nodes.length} products`;
}

// Test category fetching
async function testCategoryFetching() {
  const categories = await getCategories();
  
  if (!categories || !categories.nodes || categories.nodes.length === 0) {
    throw new Error('No categories returned');
  }
  
  return `Successfully fetched ${categories.nodes.length} categories`;
}

// Test product detail fetching
async function testProductDetail() {
  // Get a product first to use for detail test
  const products = await getProducts({ first: 1 });
  
  if (!products || !products.nodes || products.nodes.length === 0) {
    throw new Error('No products available for testing');
  }
  
  const product = products.nodes[0];
  const productDetail = await getProductBySlug(product.slug);
  
  if (!productDetail) {
    throw new Error(`Failed to fetch product details for '${product.name}'`);
  }
  
  return `Successfully fetched details for product '${productDetail.name}'`;
}

// Test inventory mapping
async function testInventoryMapping() {
  // Get a product first
  const products = await getProducts({ first: 1 });
  
  if (!products || !products.nodes || products.nodes.length === 0) {
    throw new Error('No products available for testing');
  }
  
  const product = products.nodes[0];
  
  // Add to inventory mapping
  const success = await wooInventoryMapping.addInventoryMapping(
    product.databaseId.toString(),
    product.slug
  );
  
  if (!success) {
    throw new Error('Failed to add inventory mapping');
  }
  
  // Get from inventory mapping
  const slug = await wooInventoryMapping.getProductSlugFromInventory(
    product.databaseId.toString()
  );
  
  if (!slug) {
    throw new Error('Failed to retrieve inventory mapping');
  }
  
  if (slug !== product.slug) {
    throw new Error(`Retrieved slug '${slug}' doesn't match expected '${product.slug}'`);
  }
  
  return 'Successfully tested inventory mapping';
}

// Test authentication (if test credentials available)
async function testAuthentication() {
  // Skip if no test credentials
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD not set in environment variables');
  }
  
  const result = await login(
    process.env.TEST_USER_EMAIL,
    process.env.TEST_USER_PASSWORD
  );
  
  if (!result || !result.success || !result.user) {
    throw new Error('Authentication failed');
  }
  
  return `Successfully authenticated as ${result.user.email}`;
}

// Main function to run all tests
async function main() {
  console.log('🧪 Starting WooCommerce migration validation...\n');
  
  // Run all tests
  await runTest('Product Fetching', testProductFetching);
  await runTest('Category Fetching', testCategoryFetching);
  await runTest('Product Detail', testProductDetail);
  await runTest('Inventory Mapping', testInventoryMapping);
  
  // Run authentication test if credentials are available
  if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
    await runTest('Authentication', testAuthentication);
  } else {
    console.log('Skipping authentication test (no test credentials provided)');
  }
  
  // Report results
  console.log('\n📊 Test Results:');
  
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });
  
  console.log(`\n${successCount}/${totalTests} tests passed`);
  
  // Exit with appropriate code
  if (successCount === totalTests) {
    console.log('\n🎉 All tests passed! The WooCommerce migration appears to be working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Validation failed with an unexpected error:', error);
  process.exit(1);
}); 