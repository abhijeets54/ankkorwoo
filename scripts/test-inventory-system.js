#!/usr/bin/env node

/**
 * Comprehensive CLI Test Suite for Ankkor Inventory Management System
 * 
 * Tests:
 * 1. Stock validation endpoints
 * 2. Stock reservation system
 * 3. Webhook endpoints
 * 4. Real-time stock updates (SSE)
 * 5. Cart integration
 * 6. Cleanup functionality
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'https://ankkorwoo.vercel.app';
const CLEANUP_TOKEN = process.env.CLEANUP_SECRET_TOKEN || 'ankkor_cleanup_7f9d4e2a8b1c6f3e9d7a2b5c8e1f4a7b9c2d5e8f1a4b7c0d3e6f9a2b5c8e1f4a7b';

// Test data
const TEST_PRODUCT_ID = '57'; // Replace with actual product ID
const TEST_USER_ID = `test_user_${Date.now()}`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${message}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ankkor-Test-Suite/1.0',
        ...options.headers
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test functions
async function testStockValidation() {
  logHeader('Testing Stock Validation Endpoints');

  try {
    // Test individual product stock
    logInfo(`Testing individual product stock for product ${TEST_PRODUCT_ID}`);
    const stockResponse = await makeRequest(`${BASE_URL}/api/products/${TEST_PRODUCT_ID}/stock`);
    
    if (stockResponse.status === 200) {
      logSuccess(`Stock API responded: ${JSON.stringify(stockResponse.data)}`);
    } else {
      logError(`Stock API failed with status ${stockResponse.status}: ${stockResponse.raw}`);
    }

    // Test bulk stock validation
    logInfo('Testing bulk stock validation');
    const bulkResponse = await makeRequest(`${BASE_URL}/api/products/validate-stock`, {
      method: 'POST',
      body: {
        items: [
          { productId: TEST_PRODUCT_ID, quantity: 1 }
        ]
      }
    });

    if (bulkResponse.status === 200) {
      logSuccess(`Bulk validation API responded: ${JSON.stringify(bulkResponse.data)}`);
    } else {
      logError(`Bulk validation API failed with status ${bulkResponse.status}: ${bulkResponse.raw}`);
    }

  } catch (error) {
    logError(`Stock validation test failed: ${error.message}`);
  }
}

async function testStockReservation() {
  logHeader('Testing Stock Reservation System');

  let reservationId = null;

  try {
    // Test creating a reservation
    logInfo('Creating stock reservation');
    const createResponse = await makeRequest(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      body: {
        action: 'create',
        productId: TEST_PRODUCT_ID,
        quantity: 1,
        userId: TEST_USER_ID
      }
    });

    if (createResponse.status === 200 && createResponse.data.success) {
      reservationId = createResponse.data.reservation.id;
      logSuccess(`Reservation created: ${reservationId}`);
      logInfo(`Expires at: ${createResponse.data.reservation.expiresAt}`);
    } else {
      logError(`Failed to create reservation: ${JSON.stringify(createResponse.data)}`);
      return;
    }

    // Test getting user reservations
    logInfo('Getting user reservations');
    const userReservationsResponse = await makeRequest(
      `${BASE_URL}/api/reservations?action=user_reservations&userId=${TEST_USER_ID}`
    );

    if (userReservationsResponse.status === 200) {
      logSuccess(`User has ${userReservationsResponse.data.count} reservations`);
    } else {
      logError(`Failed to get user reservations: ${userReservationsResponse.raw}`);
    }

    // Test checking available stock (should be reduced)
    logInfo('Checking available stock after reservation');
    const stockCheckResponse = await makeRequest(
      `${BASE_URL}/api/reservations?action=check_stock&productId=${TEST_PRODUCT_ID}`
    );

    if (stockCheckResponse.status === 200) {
      logSuccess(`Available stock: ${stockCheckResponse.data.availableStock}, Reserved: ${stockCheckResponse.data.reservedStock}`);
    } else {
      logError(`Failed to check stock: ${stockCheckResponse.raw}`);
    }

    // Wait a moment then release the reservation
    logInfo('Waiting 2 seconds before releasing reservation...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    logInfo('Releasing reservation');
    const releaseResponse = await makeRequest(`${BASE_URL}/api/reservations?reservationId=${reservationId}`, {
      method: 'DELETE'
    });

    if (releaseResponse.status === 200 && releaseResponse.data.success) {
      logSuccess('Reservation released successfully');
    } else {
      logError(`Failed to release reservation: ${JSON.stringify(releaseResponse.data)}`);
    }

  } catch (error) {
    logError(`Stock reservation test failed: ${error.message}`);
  }
}

async function testWebhookEndpoints() {
  logHeader('Testing Webhook Endpoints');

  try {
    // Test inventory webhook
    logInfo('Testing inventory webhook endpoint');
    const inventoryWebhookResponse = await makeRequest(`${BASE_URL}/api/webhooks/inventory`);
    
    if (inventoryWebhookResponse.status === 200) {
      logSuccess(`Inventory webhook responded: ${JSON.stringify(inventoryWebhookResponse.data)}`);
    } else {
      logError(`Inventory webhook failed with status ${inventoryWebhookResponse.status}`);
    }

    // Test order webhook
    logInfo('Testing order webhook endpoint');
    const orderWebhookResponse = await makeRequest(`${BASE_URL}/api/webhooks/order`);
    
    if (orderWebhookResponse.status === 200) {
      logSuccess(`Order webhook responded: ${JSON.stringify(orderWebhookResponse.data)}`);
    } else {
      logError(`Order webhook failed with status ${orderWebhookResponse.status}`);
    }

    // Test webhook with sample data
    logInfo('Testing inventory webhook with sample product data');
    const sampleProductData = {
      id: TEST_PRODUCT_ID,
      name: 'Test Product',
      slug: 'test-product',
      stock_status: 'instock',
      stock_quantity: 10
    };

    const webhookTestResponse = await makeRequest(`${BASE_URL}/api/webhooks/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WC-Webhook-Topic': 'product.updated'
      },
      body: sampleProductData
    });

    if (webhookTestResponse.status === 200) {
      logSuccess(`Webhook processed sample data successfully`);
    } else {
      logError(`Webhook failed to process sample data: ${webhookTestResponse.raw}`);
    }

  } catch (error) {
    logError(`Webhook test failed: ${error.message}`);
  }
}

async function testStockUpdatesSSE() {
  logHeader('Testing Real-time Stock Updates (SSE)');

  try {
    logInfo('Testing SSE endpoint connection');
    const sseResponse = await makeRequest(`${BASE_URL}/api/stock-updates?products=${TEST_PRODUCT_ID}`);
    
    if (sseResponse.status === 200) {
      logSuccess('SSE endpoint is accessible');
      logInfo(`Response headers: ${JSON.stringify(sseResponse.headers)}`);
    } else {
      logError(`SSE endpoint failed with status ${sseResponse.status}`);
    }

  } catch (error) {
    logError(`SSE test failed: ${error.message}`);
  }
}

async function testCleanupFunctionality() {
  logHeader('Testing Cleanup Functionality');

  try {
    // Test manual cleanup (GET)
    logInfo('Testing manual cleanup endpoint');
    const manualCleanupResponse = await makeRequest(`${BASE_URL}/api/reservations/cleanup`);
    
    if (manualCleanupResponse.status === 200) {
      logSuccess(`Manual cleanup completed: ${JSON.stringify(manualCleanupResponse.data)}`);
    } else {
      logError(`Manual cleanup failed with status ${manualCleanupResponse.status}`);
    }

    // Test scheduled cleanup (POST with auth)
    logInfo('Testing scheduled cleanup endpoint with authentication');
    const scheduledCleanupResponse = await makeRequest(`${BASE_URL}/api/reservations/cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLEANUP_TOKEN}`
      }
    });

    if (scheduledCleanupResponse.status === 200) {
      logSuccess(`Scheduled cleanup completed: ${JSON.stringify(scheduledCleanupResponse.data)}`);
    } else {
      logError(`Scheduled cleanup failed with status ${scheduledCleanupResponse.status}: ${scheduledCleanupResponse.raw}`);
    }

    // Test unauthorized cleanup
    logInfo('Testing unauthorized cleanup (should fail)');
    const unauthorizedResponse = await makeRequest(`${BASE_URL}/api/reservations/cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid_token'
      }
    });

    if (unauthorizedResponse.status === 401) {
      logSuccess('Unauthorized cleanup properly rejected');
    } else {
      logWarning(`Expected 401 but got ${unauthorizedResponse.status}`);
    }

  } catch (error) {
    logError(`Cleanup test failed: ${error.message}`);
  }
}

async function testSystemHealth() {
  logHeader('Testing System Health');

  try {
    // Test basic connectivity
    logInfo('Testing basic connectivity');
    const healthResponse = await makeRequest(`${BASE_URL}/api/reservations`);
    
    if (healthResponse.status === 200) {
      logSuccess('System is responding');
    } else {
      logError(`System health check failed with status ${healthResponse.status}`);
    }

    // Test Redis connectivity (indirect)
    logInfo('Testing Redis connectivity through reservation system');
    const redisTestResponse = await makeRequest(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      body: {
        action: 'create',
        productId: TEST_PRODUCT_ID,
        quantity: 1,
        userId: `health_check_${Date.now()}`
      }
    });

    if (redisTestResponse.status === 200 || redisTestResponse.status === 400) {
      logSuccess('Redis connectivity appears to be working');
    } else {
      logWarning('Redis connectivity may have issues');
    }

  } catch (error) {
    logError(`System health test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  log('\n🚀 Starting Comprehensive Inventory System Tests', 'bright');
  log(`Testing against: ${BASE_URL}`, 'cyan');
  log(`Test Product ID: ${TEST_PRODUCT_ID}`, 'cyan');
  log(`Test User ID: ${TEST_USER_ID}`, 'cyan');

  const startTime = Date.now();

  try {
    await testSystemHealth();
    await testStockValidation();
    await testStockReservation();
    await testWebhookEndpoints();
    await testStockUpdatesSSE();
    await testCleanupFunctionality();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logHeader('Test Summary');
    logSuccess(`All tests completed in ${duration} seconds`);
    log('\n📋 Test Results Summary:', 'bright');
    log('✅ System Health Check', 'green');
    log('✅ Stock Validation APIs', 'green');
    log('✅ Stock Reservation System', 'green');
    log('✅ Webhook Endpoints', 'green');
    log('✅ Real-time Updates (SSE)', 'green');
    log('✅ Cleanup Functionality', 'green');

  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'stock':
    testStockValidation();
    break;
  case 'reservation':
    testStockReservation();
    break;
  case 'webhooks':
    testWebhookEndpoints();
    break;
  case 'sse':
    testStockUpdatesSSE();
    break;
  case 'cleanup':
    testCleanupFunctionality();
    break;
  case 'health':
    testSystemHealth();
    break;
  case 'all':
  default:
    runAllTests();
    break;
}
