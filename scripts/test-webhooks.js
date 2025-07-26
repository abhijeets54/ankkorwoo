#!/usr/bin/env node

/**
 * This script tests webhook endpoints by simulating Shopify webhook requests
 * 
 * Usage:
 * node test-webhooks.js <endpoint> <topic>
 * 
 * Example:
 * node test-webhooks.js inventory inventory_levels/update
 * node test-webhooks.js products products/update
 * node test-webhooks.js orders orders/create
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Configuration
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
// In your script, change:
const BASE_URL = 'https://ankkor.in'; // Your production URL

// Get command line arguments
const args = process.argv.slice(2);
const endpoint = args[0] || 'inventory';
const topic = args[1] || 'inventory_levels/update';

// Sample webhook payload data
const samplePayloads = {
  'inventory_levels/update': {
    inventory_item_id: 123456789,
    location_id: process.env.SHOPIFY_LOCATION_ID || 123456789,
    available: 10,
    updated_at: new Date().toISOString()
  },
  'products/update': {
    id: 987654321,
    title: 'Test Product',
    handle: 'test-product',
    variants: [
      { id: 123456789, inventory_item_id: 123456789, price: '99.99' }
    ],
    product_type: 'Shirt',
    tags: 'shirt, test',
    updated_at: new Date().toISOString()
  },
  'orders/create': {
    id: 123456789,
    order_number: 1001,
    line_items: [
      { id: 123456789, name: 'Test Product', product_id: 987654321, quantity: 1 }
    ],
    customer: {
      id: 123456789,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'Customer'
    },
    created_at: new Date().toISOString()
  }
};

// Select the payload based on the topic
const payload = samplePayloads[topic] || samplePayloads['inventory_levels/update'];
const jsonPayload = JSON.stringify(payload);

// Create HMAC signature
const hmac = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(jsonPayload)
  .digest('base64');

// Determine URL
const url = `${BASE_URL}/api/webhooks/${endpoint}`;

console.log(`Testing webhook endpoint: ${url}`);
console.log(`Topic: ${topic}`);
console.log(`Payload: ${jsonPayload}`);
console.log(`HMAC: ${hmac}`);

// Prepare the request
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Topic': topic,
    'X-Shopify-Hmac-SHA256': hmac,
    'X-Shopify-Shop-Domain': 'ankkor.myshopify.com'
  }
};

// Choose http or https based on the URL
const requestLib = url.startsWith('https') ? https : http;

// Send the request
const req = requestLib.request(url, options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonResponse = JSON.parse(data);
      console.log('Response:', JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

// Send the payload
req.write(jsonPayload);
req.end(); 