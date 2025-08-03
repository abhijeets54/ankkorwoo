#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

console.log('🔍 Checking environment configuration...\n');

// Required variables for order testing
const requiredVars = [
  'NEXT_PUBLIC_WORDPRESS_URL',
  'WOOCOMMERCE_CONSUMER_KEY', 
  'WOOCOMMERCE_CONSUMER_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET'
];

// Check all possible env files
const envFiles = ['.env.local', '.env.woocommerce', '.env'];
let allEnvVars = {};

envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`📁 Found ${file}`);
    const envVars = parseEnvFile(filePath);
    allEnvVars = { ...allEnvVars, ...envVars };
  }
});

// Also check process.env
allEnvVars = { ...allEnvVars, ...process.env };

console.log('\n📋 Required variables for order testing:');
let allConfigured = true;

requiredVars.forEach(varName => {
  const value = allEnvVars[varName];
  const isSet = value && value !== 'your-' && value !== 'ck_' && value !== 'cs_' && !value.includes('example');
  console.log(`  ${varName}: ${isSet ? '✅ SET' : '❌ MISSING/PLACEHOLDER'}`);
  if (!isSet) allConfigured = false;
});

console.log('\n📊 Configuration Summary:');
console.log(`- WooCommerce URL: ${allEnvVars.NEXT_PUBLIC_WORDPRESS_URL || 'Not set'}`);
console.log(`- Consumer Key: ${allEnvVars.WOOCOMMERCE_CONSUMER_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`- Consumer Secret: ${allEnvVars.WOOCOMMERCE_CONSUMER_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`- Razorpay Key ID: ${allEnvVars.RAZORPAY_KEY_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`- Razorpay Secret: ${allEnvVars.RAZORPAY_KEY_SECRET ? '✅ Set' : '❌ Missing'}`);

if (allConfigured) {
  console.log('\n🎉 All required variables are configured!');
  console.log('✅ Ready to test order creation');
} else {
  console.log('\n⚠️  Some required variables are missing or using placeholder values');
  console.log('📝 Please update your environment configuration');
  console.log('🔧 Use .env.local or .env.woocommerce to set the correct values');
}

console.log('\n📖 Next step: Run order test with:');
console.log('   node scripts/test-order-creation.js');