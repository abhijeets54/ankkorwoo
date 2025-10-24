#!/usr/bin/env node

/**
 * Test script for stock validation functionality
 * Tests the validateStockBeforeAddToCart function with various scenarios
 */

import { gql } from 'graphql-request';

// Simulate the validateProductId function
async function validateProductId(id) {
  return id.toString();
}

// Simulate fetchFromWooCommerce function
async function fetchFromWooCommerce(query, variables, tags, revalidate) {
  console.log('📡 Fetching from WooCommerce GraphQL API...');
  console.log('Variables:', JSON.stringify(variables, null, 2));

  // Simulate API response based on test scenarios
  const productId = variables.id;

  // Test Case 1: Product with limited stock (5 items)
  if (productId === '123') {
    return {
      product: {
        id: 'gid://woocommerce/Product/123',
        databaseId: 123,
        name: 'Test Product with Limited Stock',
        type: 'SIMPLE',
        stockStatus: 'IN_STOCK',
        stockQuantity: 5,
        manageStock: true
      }
    };
  }

  // Test Case 2: Product out of stock
  if (productId === '456') {
    return {
      product: {
        id: 'gid://woocommerce/Product/456',
        databaseId: 456,
        name: 'Out of Stock Product',
        type: 'SIMPLE',
        stockStatus: 'OUT_OF_STOCK',
        stockQuantity: 0,
        manageStock: true
      }
    };
  }

  // Test Case 3: Variable product with variations
  if (productId === '789') {
    return {
      product: {
        id: 'gid://woocommerce/Product/789',
        databaseId: 789,
        name: 'Variable Product with Sizes',
        type: 'VARIABLE',
        stockStatus: 'IN_STOCK',
        stockQuantity: null,
        manageStock: false,
        variations: {
          nodes: [
            {
              id: 'gid://woocommerce/ProductVariation/7891',
              databaseId: 7891,
              stockStatus: 'IN_STOCK',
              stockQuantity: 3,
              manageStock: true
            },
            {
              id: 'gid://woocommerce/ProductVariation/7892',
              databaseId: 7892,
              stockStatus: 'OUT_OF_STOCK',
              stockQuantity: 0,
              manageStock: true
            }
          ]
        }
      }
    };
  }

  // Test Case 4: Product with unlimited stock (stock not managed)
  if (productId === '999') {
    return {
      product: {
        id: 'gid://woocommerce/Product/999',
        databaseId: 999,
        name: 'Product with Unlimited Stock',
        type: 'SIMPLE',
        stockStatus: 'IN_STOCK',
        stockQuantity: null,
        manageStock: false
      }
    };
  }

  // Default: Product not found
  return { product: null };
}

/**
 * Validate stock availability before adding to cart
 */
async function validateStockBeforeAddToCart({
  productId,
  variationId,
  requestedQuantity
}) {
  try {
    const validatedId = await validateProductId(productId.toString());

    const STOCK_CHECK_QUERY = gql`
      query CheckProductStock($id: ID!, $variationId: ID) {
        product(id: $id, idType: DATABASE_ID) {
          id
          databaseId
          name
          type
          ... on SimpleProduct {
            stockStatus
            stockQuantity
            manageStock
          }
          ... on VariableProduct {
            stockStatus
            stockQuantity
            manageStock
            variations {
              nodes {
                id
                databaseId
                stockStatus
                stockQuantity
                manageStock
              }
            }
          }
        }
      }
    `;

    const data = await fetchFromWooCommerce(
      STOCK_CHECK_QUERY,
      { id: validatedId, variationId: variationId ? variationId.toString() : null },
      [],
      0
    );

    if (!data?.product) {
      return {
        isValid: false,
        availableStock: null,
        message: 'Product not found'
      };
    }

    const product = data.product;
    let stockQuantity = null;
    let stockStatus = '';

    // Check if this is a variable product with specific variation
    if (variationId && product.variations?.nodes) {
      const variation = product.variations.nodes.find(
        (v) => v.databaseId?.toString() === variationId.toString() || v.id === variationId.toString()
      );

      if (!variation) {
        return {
          isValid: false,
          availableStock: null,
          message: 'Product variation not found'
        };
      }

      stockStatus = variation.stockStatus || '';
      stockQuantity = variation.stockQuantity;

      if (!variation.manageStock) {
        const isInStock = stockStatus === 'IN_STOCK' || stockStatus === 'instock';
        return {
          isValid: isInStock,
          availableStock: isInStock ? null : 0,
          message: isInStock ? undefined : 'This product variation is out of stock'
        };
      }
    } else {
      stockStatus = product.stockStatus || '';
      stockQuantity = product.stockQuantity;

      if (!product.manageStock) {
        const isInStock = stockStatus === 'IN_STOCK' || stockStatus === 'instock';
        return {
          isValid: isInStock,
          availableStock: isInStock ? null : 0,
          message: isInStock ? undefined : 'This product is out of stock'
        };
      }
    }

    const isOutOfStock = stockStatus === 'OUT_OF_STOCK' ||
                         stockStatus === 'outofstock' ||
                         stockQuantity === 0;

    if (isOutOfStock) {
      return {
        isValid: false,
        availableStock: 0,
        message: 'This product is out of stock'
      };
    }

    if (stockQuantity !== null && requestedQuantity > stockQuantity) {
      return {
        isValid: false,
        availableStock: stockQuantity,
        cappedQuantity: stockQuantity,
        message: `Only ${stockQuantity} item${stockQuantity !== 1 ? 's' : ''} available in stock`
      };
    }

    return {
      isValid: true,
      availableStock: stockQuantity,
      message: undefined
    };

  } catch (error) {
    console.error('Error validating stock:', error);
    return {
      isValid: false,
      availableStock: null,
      message: 'Unable to verify stock availability. Please try again.'
    };
  }
}

/**
 * Run test cases
 */
async function runTests() {
  console.log('🧪 Starting Stock Validation Tests\n');
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Test 1: Request quantity within available stock',
      params: { productId: '123', requestedQuantity: 3 },
      expectedValid: true,
      expectedMessage: undefined
    },
    {
      name: 'Test 2: Request quantity exceeds available stock',
      params: { productId: '123', requestedQuantity: 10 },
      expectedValid: false,
      expectedMessage: 'Only 5 items available in stock'
    },
    {
      name: 'Test 3: Product out of stock',
      params: { productId: '456', requestedQuantity: 1 },
      expectedValid: false,
      expectedMessage: 'This product is out of stock'
    },
    {
      name: 'Test 4: Variable product with in-stock variation',
      params: { productId: '789', variationId: '7891', requestedQuantity: 2 },
      expectedValid: true,
      expectedMessage: undefined
    },
    {
      name: 'Test 5: Variable product with out-of-stock variation',
      params: { productId: '789', variationId: '7892', requestedQuantity: 1 },
      expectedValid: false,
      expectedMessage: 'This product is out of stock'
    },
    {
      name: 'Test 6: Variable product - variation stock exceeded',
      params: { productId: '789', variationId: '7891', requestedQuantity: 5 },
      expectedValid: false,
      expectedMessage: 'Only 3 items available in stock'
    },
    {
      name: 'Test 7: Product with unlimited stock (stock not managed)',
      params: { productId: '999', requestedQuantity: 100 },
      expectedValid: true,
      expectedMessage: undefined
    },
    {
      name: 'Test 8: Product not found',
      params: { productId: '000', requestedQuantity: 1 },
      expectedValid: false,
      expectedMessage: 'Product not found'
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    console.log(`\n📝 ${test.name}`);
    console.log('-'.repeat(60));

    const result = await validateStockBeforeAddToCart(test.params);

    console.log('Input:', JSON.stringify(test.params, null, 2));
    console.log('Result:', JSON.stringify(result, null, 2));

    const validMatch = result.isValid === test.expectedValid;
    const messageMatch = result.message === test.expectedMessage;

    if (validMatch && messageMatch) {
      console.log('✅ PASSED');
      passedTests++;
    } else {
      console.log('❌ FAILED');
      console.log(`   Expected isValid: ${test.expectedValid}, Got: ${result.isValid}`);
      console.log(`   Expected message: "${test.expectedMessage}", Got: "${result.message}"`);
      failedTests++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passedTests}/${tests.length}`);
  console.log(`   ❌ Failed: ${failedTests}/${tests.length}`);
  console.log(`   Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
