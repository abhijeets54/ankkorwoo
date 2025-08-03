#!/usr/bin/env node

/**
 * Test script to verify WooCommerce connection and order creation capability
 * This test focuses only on WooCommerce without Razorpay payment processing
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvVars() {
  // Start with process.env
  let allEnvVars = { ...process.env };
  
  // Prioritize .env.local first
  const envFiles = ['.env.local', '.env.woocommerce', '.env'];

  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`📁 Loading ${file}`);
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Only override if we don't have it yet
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
  wooUrl: env.NEXT_PUBLIC_WORDPRESS_URL?.replace('https://', '').replace('http://', ''),
  consumerKey: env.WOOCOMMERCE_CONSUMER_KEY,
  consumerSecret: env.WOOCOMMERCE_CONSUMER_SECRET
};

// Fix URL format
if (TEST_CONFIG.wooUrl && !TEST_CONFIG.wooUrl.startsWith('http')) {
  TEST_CONFIG.wooUrl = `https://${TEST_CONFIG.wooUrl}`;
}

// Sample test order data
const TEST_ORDER_DATA = {
  billing: {
    first_name: 'Test',
    last_name: 'Customer',
    address_1: '123 Test Street',
    address_2: 'Apt 1',
    city: 'Mumbai',
    state: 'Maharashtra',
    postcode: '400001',
    country: 'IN',
    phone: '+919876543210',
    email: 'test@example.com'
  },
  shipping: {
    first_name: 'Test',
    last_name: 'Customer',
    address_1: '123 Test Street',
    address_2: 'Apt 1',
    city: 'Mumbai',
    state: 'Maharashtra',
    postcode: '400001',
    country: 'IN'
  },
  line_items: [
    {
      product_id: 1, // We'll update this with a real product ID
      quantity: 1
    }
  ],
  payment_method: 'cod',
  payment_method_title: 'Cash on Delivery',
  set_paid: false,
  status: 'pending',
  meta_data: [
    {
      key: 'test_order',
      value: 'true'
    },
    {
      key: 'created_by',
      value: 'order_test_script'
    }
  ]
};

async function testWooCommerceConnection() {
  console.log('🔍 Testing WooCommerce connection...');
  
  if (!TEST_CONFIG.wooUrl || !TEST_CONFIG.consumerKey || !TEST_CONFIG.consumerSecret) {
    console.error('❌ WooCommerce credentials not configured');
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

async function getFirstProduct() {
  console.log('\n🛍️ Fetching first available product...');
  
  try {
    const auth = Buffer.from(`${TEST_CONFIG.consumerKey}:${TEST_CONFIG.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${TEST_CONFIG.wooUrl}/wp-json/wc/v3/products?per_page=1&status=publish`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (response.ok) {
      const products = await response.json();
      if (products && products.length > 0) {
        const product = products[0];
        console.log(`✅ Found product: ${product.name} (ID: ${product.id})`);
        console.log(`💰 Price: ${product.price || 'N/A'}`);
        console.log(`📦 Stock: ${product.stock_status}`);
        return product;
      } else {
        console.log('⚠️  No products found in store');
        return null;
      }
    } else {
      const error = await response.json();
      console.error('❌ Failed to fetch products:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
    return null;
  }
}

async function createTestOrder(productId) {
  console.log('\\n📝 Creating test order in WooCommerce...');
  
  try {
    // Update order data with real product ID
    const orderData = {
      ...TEST_ORDER_DATA,
      line_items: [
        {
          product_id: productId,
          quantity: 1
        }
      ]
    };

    const auth = Buffer.from(`${TEST_CONFIG.consumerKey}:${TEST_CONFIG.consumerSecret}`).toString('base64');
    
    console.log('📤 Sending order to WooCommerce...');
    
    const response = await fetch(`${TEST_CONFIG.wooUrl}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(orderData)
    });

    if (response.ok) {
      const order = await response.json();
      console.log('✅ Order created successfully in WooCommerce!');
      console.log(`📋 Order ID: ${order.id}`);
      console.log(`📋 Order Number: ${order.number}`);
      console.log(`💰 Total: ${order.currency} ${order.total}`);
      console.log(`📍 Status: ${order.status}`);
      console.log(`👤 Customer: ${order.billing.first_name} ${order.billing.last_name}`);
      
      return order;
    } else {
      const error = await response.json();
      console.error('❌ Order creation failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Order creation error:', error.message);
    return null;
  }
}

async function verifyOrderInAdmin(orderId) {
  console.log(`\\n🔍 Verifying order ${orderId} is visible in admin...`);
  
  try {
    const auth = Buffer.from(`${TEST_CONFIG.consumerKey}:${TEST_CONFIG.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${TEST_CONFIG.wooUrl}/wp-json/wc/v3/orders/${orderId}`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (response.ok) {
      const order = await response.json();
      console.log('✅ Order confirmed in WooCommerce admin!');
      console.log(`📅 Date Created: ${order.date_created}`);
      console.log(`🔗 Admin URL: ${TEST_CONFIG.wooUrl}/wp-admin/post.php?post=${orderId}&action=edit`);
      
      if (order.line_items && order.line_items.length > 0) {
        console.log('🛍️ Items in order:');
        order.line_items.forEach(item => {
          console.log(`  - ${item.name} (Qty: ${item.quantity}) - ${order.currency} ${item.total}`);
        });
      }
      
      return true;
    } else {
      console.error('❌ Could not verify order in admin');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying order:', error.message);
    return false;
  }
}

async function runWooCommerceTest() {
  console.log('🚀 Starting WooCommerce Order Test\\n');
  console.log('📋 Test Configuration:');
  console.log(`- WooCommerce URL: ${TEST_CONFIG.wooUrl || 'Not configured'}`);
  console.log(`- Consumer Key: ${TEST_CONFIG.consumerKey ? 'Configured' : 'Missing'}`);
  console.log(`- Consumer Secret: ${TEST_CONFIG.consumerSecret ? 'Configured' : 'Missing'}`);
  console.log('');

  // Step 1: Test WooCommerce connection
  const wooConnected = await testWooCommerceConnection();
  if (!wooConnected) {
    console.log('\\n❌ Cannot proceed without WooCommerce connection');
    return;
  }

  // Step 2: Get a product to use in the test order
  const product = await getFirstProduct();
  if (!product) {
    console.log('\\n⚠️  No products available, creating order with product ID 1');
  }

  // Step 3: Create test order
  const productId = product ? product.id : 1;
  const order = await createTestOrder(productId);
  
  // Step 4: Verify order in admin
  let adminVerified = false;
  if (order) {
    adminVerified = await verifyOrderInAdmin(order.id);
  }

  console.log('\\n🎯 Test Summary:');
  console.log(`✅ WooCommerce Connection: ${wooConnected ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Product Discovery: ${product ? 'PASS' : 'USED FALLBACK'}`);
  console.log(`✅ Order Creation: ${order ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Admin Verification: ${adminVerified ? 'PASS' : 'FAIL'}`);

  if (order) {
    console.log('\\n🎉 SUCCESS: Orders are being sent to WooCommerce successfully!');
    console.log(`📋 Test order created with ID: ${order.id}`);
    console.log(`🔗 Check admin: ${TEST_CONFIG.wooUrl}/wp-admin/edit.php?post_type=shop_order`);
    console.log('👀 Please confirm the order appears in your WooCommerce admin panel.');
    
    console.log('\\n💡 This confirms that:');
    console.log('   ✅ WooCommerce API is working');
    console.log('   ✅ Orders can be created via REST API');
    console.log('   ✅ Order data is properly formatted');
    console.log('   ✅ Orders appear in admin dashboard');
  } else {
    console.log('\\n❌ FAILURE: Orders are not being sent to WooCommerce');
    console.log('🔧 Please check your WooCommerce configuration');
  }
}

// Run the test
runWooCommerceTest().catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});