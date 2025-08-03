#!/usr/bin/env node

/**
 * Test script to verify order creation flow with WooCommerce
 * This script tests the entire order creation pipeline
 */

const crypto = require('crypto');

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

function loadEnvVars() {
  let allEnvVars = { ...process.env };
  
  const envFiles = ['.env.local', '.env.woocommerce', '.env'];
  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (!allEnvVars[key.trim()] || file === '.env.local') {
              allEnvVars[key.trim()] = value;
            }
          }
        }
      });
    }
  });

  return allEnvVars;
}

const env = loadEnvVars();

// Test configuration
const TEST_CONFIG = {
  baseUrl: env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  wooUrl: env.NEXT_PUBLIC_WORDPRESS_URL,
  consumerKey: env.WOOCOMMERCE_CONSUMER_KEY,
  consumerSecret: env.WOOCOMMERCE_CONSUMER_SECRET,
  razorpayKeyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID,
  razorpayKeySecret: env.RAZORPAY_KEY_SECRET
};

// Sample test order data
const TEST_ORDER_DATA = {
  address: {
    firstName: 'Test',
    lastName: 'Customer',
    address1: '123 Test Street',
    address2: 'Apt 1',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '+919876543210'
  },
  cartItems: [
    {
      productId: '1', // Replace with actual product ID from your WooCommerce store
      quantity: 1,
      price: '1999.00',
      name: 'Test Product'
    }
  ],
  shipping: {
    id: 'free_shipping',
    name: 'Free Shipping',
    cost: 0
  }
};

async function testWooCommerceConnection() {
  console.log('🔍 Testing WooCommerce connection...');
  
  if (!TEST_CONFIG.wooUrl || !TEST_CONFIG.consumerKey || !TEST_CONFIG.consumerSecret) {
    console.error('❌ WooCommerce credentials not configured');
    console.log('Required environment variables:');
    console.log('- NEXT_PUBLIC_WORDPRESS_URL');
    console.log('- WOOCOMMERCE_CONSUMER_KEY');
    console.log('- WOOCOMMERCE_CONSUMER_SECRET');
    return false;
  }

  try {
    const auth = Buffer.from(`${TEST_CONFIG.consumerKey}:${TEST_CONFIG.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${TEST_CONFIG.wooUrl}/wp-json/wc/v3/orders?per_page=1`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (response.ok) {
      const orders = await response.json();
      console.log('✅ WooCommerce connection successful');
      console.log(`📊 Found ${Array.isArray(orders) ? orders.length : 0} recent orders`);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ WooCommerce connection failed:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ WooCommerce connection error:', error.message);
    return false;
  }
}

async function testCreateRazorpayOrder() {
  console.log('\n💳 Testing Razorpay order creation...');
  
  if (!TEST_CONFIG.razorpayKeyId || !TEST_CONFIG.razorpayKeySecret) {
    console.error('❌ Razorpay credentials not configured');
    console.log('Required environment variables:');
    console.log('- RAZORPAY_KEY_ID');
    console.log('- RAZORPAY_KEY_SECRET');
    return null;
  }

  try {
    const orderData = {
      amount: 199900, // Amount in paise (₹1999)
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      notes: {
        test: 'true',
        source: 'order_test_script'
      }
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Razorpay order created successfully');
      console.log(`📋 Order ID: ${result.id}`);
      return result;
    } else {
      const error = await response.json();
      console.error('❌ Razorpay order creation failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Razorpay order creation error:', error.message);
    return null;
  }
}

function generateMockRazorpaySignature(orderId, paymentId) {
  if (!TEST_CONFIG.razorpayKeySecret) {
    return null;
  }
  
  return crypto
    .createHmac('sha256', TEST_CONFIG.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function testOrderVerificationAndCreation(razorpayOrder) {
  console.log('\n📝 Testing order verification and WooCommerce creation...');
  
  if (!razorpayOrder) {
    console.error('❌ No Razorpay order to test with');
    return false;
  }

  try {
    // Generate mock payment data
    const mockPaymentId = `pay_${Date.now()}`;
    const mockSignature = generateMockRazorpaySignature(razorpayOrder.id, mockPaymentId);
    
    if (!mockSignature) {
      console.error('❌ Cannot generate signature without Razorpay secret');
      return false;
    }

    const verificationData = {
      razorpay_payment_id: mockPaymentId,
      razorpay_order_id: razorpayOrder.id,
      razorpay_signature: mockSignature,
      address: TEST_ORDER_DATA.address,
      cartItems: TEST_ORDER_DATA.cartItems,
      shipping: TEST_ORDER_DATA.shipping
    };

    console.log('📤 Sending verification request...');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/razorpay/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verificationData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Order verification and creation successful');
      console.log(`🎯 WooCommerce Order ID: ${result.orderId}`);
      return result.orderId;
    } else {
      const error = await response.json();
      console.error('❌ Order verification failed:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Order verification error:', error.message);
    return false;
  }
}

async function verifyOrderInWooCommerce(orderId) {
  console.log(`\n🔍 Verifying order ${orderId} in WooCommerce...`);
  
  try {
    const auth = Buffer.from(`${TEST_CONFIG.consumerKey}:${TEST_CONFIG.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${TEST_CONFIG.wooUrl}/wp-json/wc/v3/orders/${orderId}`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (response.ok) {
      const order = await response.json();
      console.log('✅ Order found in WooCommerce!');
      console.log(`📋 Order Number: ${order.number}`);
      console.log(`💰 Total: ${order.currency} ${order.total}`);
      console.log(`📍 Status: ${order.status}`);
      console.log(`👤 Customer: ${order.billing.first_name} ${order.billing.last_name}`);
      console.log(`📧 Email: ${order.billing.email || 'Not provided'}`);
      console.log(`🏠 Address: ${order.billing.address_1}, ${order.billing.city}`);
      
      if (order.line_items && order.line_items.length > 0) {
        console.log('🛍️ Items:');
        order.line_items.forEach(item => {
          console.log(`  - ${item.name} (Qty: ${item.quantity}) - ${order.currency} ${item.total}`);
        });
      }
      
      if (order.meta_data) {
        const razorpayData = order.meta_data.filter(meta => 
          meta.key.includes('razorpay') || meta.key.includes('payment')
        );
        if (razorpayData.length > 0) {
          console.log('💳 Payment Info:');
          razorpayData.forEach(meta => {
            console.log(`  - ${meta.key}: ${meta.value}`);
          });
        }
      }
      
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Order not found in WooCommerce:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying order in WooCommerce:', error.message);
    return false;
  }
}

async function runOrderTest() {
  console.log('🚀 Starting Order Creation Test\n');
  console.log('📋 Test Configuration:');
  console.log(`- Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`- WooCommerce URL: ${TEST_CONFIG.wooUrl || 'Not configured'}`);
  console.log(`- Razorpay configured: ${TEST_CONFIG.razorpayKeyId ? 'Yes' : 'No'}`);
  console.log('');

  // Step 1: Test WooCommerce connection
  const wooConnected = await testWooCommerceConnection();
  if (!wooConnected) {
    console.log('\n❌ Cannot proceed without WooCommerce connection');
    return;
  }

  // Step 2: Create Razorpay order
  const razorpayOrder = await testCreateRazorpayOrder();
  
  // Step 3: Test order verification and creation
  const wooOrderId = await testOrderVerificationAndCreation(razorpayOrder);
  
  // Step 4: Verify order in WooCommerce
  if (wooOrderId) {
    await verifyOrderInWooCommerce(wooOrderId);
  }

  console.log('\n🎯 Test Summary:');
  console.log(`✅ WooCommerce Connection: ${wooConnected ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Razorpay Order Creation: ${razorpayOrder ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Order Verification: ${wooOrderId ? 'PASS' : 'FAIL'}`);
  console.log(`✅ WooCommerce Order: ${wooOrderId ? 'CREATED' : 'FAILED'}`);

  if (wooOrderId) {
    console.log('\n🎉 SUCCESS: Orders are being sent to WooCommerce successfully!');
    console.log(`📋 Test order created with ID: ${wooOrderId}`);
    console.log('👀 Please check your WooCommerce admin panel to confirm the order appears.');
  } else {
    console.log('\n❌ FAILURE: Orders are not being sent to WooCommerce');
    console.log('🔧 Please check your configuration and try again.');
  }
}

// Run the test
runOrderTest().catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});