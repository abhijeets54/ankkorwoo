// Test script to verify WooCommerce guest checkout functionality
// CommonJS version for compatibility
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const config = {
  // WordPress/WooCommerce site URL
  siteUrl: 'https://deepskyblue-penguin-370791.hostingersite.com',
  
  // API endpoints
  endpoints: {
    guestCheckout: '/wp-json/ankkor/v1/guest-checkout',
    fixCheckout: '/wp-json/ankkor/v1/fix-checkout',
    graphql: '/graphql',
    products: '/wp-json/wc/v3/products',
    cart: '/wp-json/wc/store/v1/cart',
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Print a header
console.log(`${colors.cyan}================================================================================`);
console.log(`WOOCOMMERCE GUEST CHECKOUT VERIFICATION`);
console.log(`================================================================================\n${colors.reset}`);

console.log(`This script will test the WooCommerce guest checkout functionality and CORS configuration.\n`);

// Run all tests
async function runTests() {
  try {
    // Test 1: Check if the guest checkout endpoint is accessible
    await testGuestCheckoutEndpoint();
    
    // Test 2: Check if the fix-checkout endpoint is working
    await testFixCheckoutEndpoint();
    
    // Test 3: Test GraphQL endpoint with CORS headers
    await testGraphQLEndpoint();
    
    // Test 4: Test guest checkout URL parameters
    testCheckoutURLParameters();
    
    // Print summary
    console.log(`\n${colors.cyan}================================================================================`);
    console.log(`TEST SUMMARY`);
    console.log(`================================================================================\n${colors.reset}`);
    
    console.log(`If all tests passed, your WooCommerce guest checkout should be working correctly.`);
    console.log(`\nIf you're still experiencing issues, check the following:`);
    console.log(`1. Make sure the WooCommerce Guest Checkout Fix plugin is activated`);
    console.log(`2. Verify WooCommerce settings at ${config.siteUrl}/wp-admin/admin.php?page=wc-settings&tab=account`);
    console.log(`3. Clear all caches (WordPress, browser, CDN)`);
    console.log(`4. Check browser console for any JavaScript errors`);
    console.log(`5. Test in an incognito/private browser window to ensure you're not already logged in`);
    
  } catch (error) {
    console.error(`${colors.red}Error running tests: ${error.message}${colors.reset}`);
  }
}

// Test the guest checkout endpoint
async function testGuestCheckoutEndpoint() {
  console.log(`${colors.blue}TEST 1: Testing guest checkout endpoint...${colors.reset}`);
  
  try {
    const response = await fetch(`${config.siteUrl}${config.endpoints.guestCheckout}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000' // Simulate request from frontend
      }
    });
    
    const data = await response.json();
    
    // Check response status
    if (response.ok) {
      console.log(`${colors.green}✓ Guest checkout endpoint is accessible${colors.reset}`);
      
      // Check if the response contains a checkout URL
      if (data.success && data.checkout_url) {
        console.log(`${colors.green}✓ Received valid checkout URL: ${data.checkout_url}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Response doesn't contain a valid checkout URL${colors.reset}`);
      }
      
      // Check CORS headers
      checkCORSHeaders(response);
      
    } else {
      console.log(`${colors.red}✗ Guest checkout endpoint returned error: ${response.status} ${response.statusText}${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Error accessing guest checkout endpoint: ${error.message}${colors.reset}`);
  }
}

// Test the fix-checkout endpoint
async function testFixCheckoutEndpoint() {
  console.log(`\n${colors.blue}TEST 2: Testing fix-checkout endpoint...${colors.reset}`);
  
  try {
    const response = await fetch(`${config.siteUrl}${config.endpoints.fixCheckout}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000' // Simulate request from frontend
      },
      body: JSON.stringify({ force_guest_checkout: true })
    });
    
    const data = await response.json();
    
    // Check response status
    if (response.ok) {
      console.log(`${colors.green}✓ Fix-checkout endpoint is accessible${colors.reset}`);
      
      // Check if the response indicates success
      if (data.success) {
        console.log(`${colors.green}✓ Successfully set guest checkout session${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Failed to set guest checkout session${colors.reset}`);
      }
      
      // Check CORS headers
      checkCORSHeaders(response);
      
    } else {
      console.log(`${colors.red}✗ Fix-checkout endpoint returned error: ${response.status} ${response.statusText}${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Error accessing fix-checkout endpoint: ${error.message}${colors.reset}`);
  }
}

// Test GraphQL endpoint with CORS headers
async function testGraphQLEndpoint() {
  console.log(`\n${colors.blue}TEST 3: Testing GraphQL endpoint with CORS...${colors.reset}`);
  
  // Simple GraphQL query to get site info
  const query = `
    query {
      generalSettings {
        title
        url
      }
    }
  `;
  
  try {
    const response = await fetch(`${config.siteUrl}${config.endpoints.graphql}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000' // Simulate request from frontend
      },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    
    // Check response status
    if (response.ok) {
      console.log(`${colors.green}✓ GraphQL endpoint is accessible${colors.reset}`);
      
      // Check if the response contains data
      if (data.data && data.data.generalSettings) {
        console.log(`${colors.green}✓ Received valid GraphQL response: Site title = "${data.data.generalSettings.title}"${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Response doesn't contain valid GraphQL data${colors.reset}`);
      }
      
      // Check CORS headers
      checkCORSHeaders(response);
      
    } else {
      console.log(`${colors.red}✗ GraphQL endpoint returned error: ${response.status} ${response.statusText}${colors.reset}`);
      console.log(`${colors.red}Error details: ${JSON.stringify(data)}${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}✗ Error accessing GraphQL endpoint: ${error.message}${colors.reset}`);
  }
}

// Test checkout URL parameters
function testCheckoutURLParameters() {
  console.log(`\n${colors.blue}TEST 4: Verifying checkout URL parameters...${colors.reset}`);
  
  // Build the checkout URL with all necessary parameters
  const checkoutUrl = `${config.siteUrl}/checkout/?guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0&skip_login=1&force_guest_checkout=1`;
  
  console.log(`${colors.green}✓ Checkout URL with guest parameters:${colors.reset}`);
  console.log(`  ${checkoutUrl}`);
  
  console.log(`\n${colors.yellow}To manually test this URL:${colors.reset}`);
  console.log(`1. Open an incognito/private browser window`);
  console.log(`2. Visit the URL above`);
  console.log(`3. Verify you can proceed with checkout without being asked to log in`);
}

// Helper function to check CORS headers
function checkCORSHeaders(response) {
  const corsHeaders = {
    'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
    'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
    'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
    'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
  };
  
  console.log(`${colors.blue}Checking CORS headers:${colors.reset}`);
  
  // Check Access-Control-Allow-Origin
  if (corsHeaders['access-control-allow-origin']) {
    const origin = corsHeaders['access-control-allow-origin'];
    if (origin === '*' || origin === 'http://localhost:3000') {
      console.log(`${colors.green}✓ Access-Control-Allow-Origin: ${origin}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Access-Control-Allow-Origin is set but may not match your frontend: ${origin}${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}✗ Missing Access-Control-Allow-Origin header${colors.reset}`);
  }
  
  // Check Access-Control-Allow-Credentials
  if (corsHeaders['access-control-allow-credentials'] === 'true') {
    console.log(`${colors.green}✓ Access-Control-Allow-Credentials: true${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Missing or invalid Access-Control-Allow-Credentials header${colors.reset}`);
  }
  
  // Check Access-Control-Allow-Methods
  if (corsHeaders['access-control-allow-methods']) {
    console.log(`${colors.green}✓ Access-Control-Allow-Methods: ${corsHeaders['access-control-allow-methods']}${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Missing Access-Control-Allow-Methods header${colors.reset}`);
  }
  
  // Check Access-Control-Allow-Headers
  if (corsHeaders['access-control-allow-headers']) {
    console.log(`${colors.green}✓ Access-Control-Allow-Headers: ${corsHeaders['access-control-allow-headers']}${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Missing Access-Control-Allow-Headers header${colors.reset}`);
  }
}

// Run all tests
runTests(); 