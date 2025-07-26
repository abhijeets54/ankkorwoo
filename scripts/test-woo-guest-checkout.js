#!/usr/bin/env node

/**
 * Test WooCommerce Guest Checkout
 * This script tests the WooCommerce guest checkout functionality
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Get WooCommerce URL from environment variables
const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

if (!baseUrl) {
  console.error('Error: WooCommerce URL not found in environment variables.');
  console.log('Please set NEXT_PUBLIC_WOOCOMMERCE_URL or NEXT_PUBLIC_BACKEND_URL in your .env.local file.');
  process.exit(1);
}

console.log('================================================================================');
console.log('WOOCOMMERCE GUEST CHECKOUT TEST');
console.log('================================================================================\n');

// Test different checkout URLs
const testUrls = [
  // Test 1: Direct checkout URL with guest parameters
  {
    name: 'Direct Guest Checkout URL',
    url: `${baseUrl}/checkout/?guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0&skip_login=1&force_guest_checkout=1`
  },
  
  // Test 2: Custom API endpoint (if plugin is installed)
  {
    name: 'Custom API Endpoint',
    url: `${baseUrl}/wp-json/ankkor/v1/guest-checkout`
  },
  
  // Test 3: Standard checkout URL
  {
    name: 'Standard Checkout URL',
    url: `${baseUrl}/checkout/`
  }
];

// Create HTML file for testing
const createTestHtml = () => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WooCommerce Guest Checkout Test</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 4px;
      background-color: #f9f9f9;
    }
    .test-card {
      border: 1px solid #ddd;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .test-card h3 {
      margin-top: 0;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .button {
      display: inline-block;
      background-color: #4CAF50;
      border: none;
      color: white;
      padding: 10px 20px;
      text-align: center;
      text-decoration: none;
      font-size: 16px;
      margin: 10px 0;
      cursor: pointer;
      border-radius: 4px;
    }
    .note {
      background-color: #e1f5fe;
      padding: 10px;
      border-left: 5px solid #03a9f4;
      margin: 20px 0;
    }
    pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .api-test {
      margin-top: 30px;
    }
    #apiResponse {
      min-height: 100px;
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>WooCommerce Guest Checkout Test</h1>
    <p>This page will help you test different guest checkout approaches for your WooCommerce store.</p>
    
    <div class="note">
      <strong>Note:</strong> For best results, test in an incognito/private browsing window to avoid session conflicts.
    </div>
    
    <div class="test-card">
      <h3>Test 1: Direct Guest Checkout URL</h3>
      <p>This test uses a direct URL with guest checkout parameters:</p>
      <pre>${testUrls[0].url}</pre>
      <a href="${testUrls[0].url}" class="button" target="_blank">Test Direct Guest Checkout</a>
    </div>
    
    <div class="test-card">
      <h3>Test 2: Custom API Endpoint (if plugin is installed)</h3>
      <p>This test uses the custom API endpoint provided by the Ankkor WooCommerce Guest Checkout plugin:</p>
      <div class="api-test">
        <button id="testApiButton" class="button">Test API Endpoint</button>
        <div id="apiResponse">API response will appear here...</div>
      </div>
    </div>
    
    <div class="test-card">
      <h3>Test 3: Standard Checkout URL</h3>
      <p>This test uses the standard checkout URL:</p>
      <pre>${testUrls[2].url}</pre>
      <a href="${testUrls[2].url}" class="button" target="_blank">Test Standard Checkout</a>
    </div>
    
    <h2>Troubleshooting</h2>
    <ul>
      <li>If you are redirected to login, check if the plugin is properly installed and activated.</li>
      <li>Clear all browser cookies and cache before testing.</li>
      <li>Check server logs for any errors.</li>
      <li>Make sure guest checkout is enabled in WooCommerce settings.</li>
    </ul>
  </div>
  
  <script>
    document.getElementById('testApiButton').addEventListener('click', async function() {
      const responseElement = document.getElementById('apiResponse');
      responseElement.textContent = 'Testing API endpoint...';
      
      try {
        const response = await fetch('${testUrls[1].url}', {
          method: 'GET',
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success && data.checkout_url) {
          responseElement.textContent = JSON.stringify(data, null, 2);
          
          // Add a button to navigate to the checkout URL
          const button = document.createElement('a');
          button.href = data.checkout_url;
          button.className = 'button';
          button.textContent = 'Go to Checkout';
          button.target = '_blank';
          responseElement.appendChild(document.createElement('br'));
          responseElement.appendChild(button);
        } else {
          responseElement.textContent = 'API endpoint returned an invalid response: ' + JSON.stringify(data, null, 2);
        }
      } catch (error) {
        responseElement.textContent = 'Error testing API endpoint: ' + error.message;
      }
    });
  </script>
</body>
</html>
  `;

  const tempFilePath = path.resolve(__dirname, '../woo-guest-checkout-test.html');
  fs.writeFileSync(tempFilePath, htmlContent);
  
  return tempFilePath;
};

// Create and open the test HTML file
const testHtmlPath = createTestHtml();
console.log('Created test HTML file at:', testHtmlPath);
console.log('\nOpening test page in browser...\n');

// Open the HTML file in the default browser
try {
  const fileUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;
  
  // Different commands for different OS
  switch (process.platform) {
    case 'win32':
      execSync(`start "" "${fileUrl}"`);
      break;
    case 'darwin':
      execSync(`open "${fileUrl}"`);
      break;
    default:
      execSync(`xdg-open "${fileUrl}"`);
  }
  
  console.log('Browser opened with test page. Follow the instructions on the page to test guest checkout.\n');
} catch (error) {
  console.error('Failed to open browser:', error.message);
  console.log('\nPlease manually open this file in your browser:');
  console.log(testHtmlPath);
}

console.log('================================================================================');
console.log('TEST INSTRUCTIONS:');
console.log('================================================================================');
console.log('1. Use an incognito/private browsing window for testing');
console.log('2. Try each test method and note which one works best');
console.log('3. If none work, check that the plugin is properly installed and activated');
console.log('4. Check server logs for any errors');
console.log('================================================================================'); 