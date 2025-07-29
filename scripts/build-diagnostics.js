const fs = require('fs');
const path = require('path');

console.log('=== Build Diagnostics ===\n');

// Check environment variables
console.log('1. Checking Environment Variables:');
const requiredEnvVars = [
  'NEXT_PUBLIC_WOOCOMMERCE_URL',
  'WOOCOMMERCE_CONSUMER_KEY',
  'WOOCOMMERCE_CONSUMER_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'JWT_SECRET_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'QSTASH_URL',
  'QSTASH_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY'
];

const missingEnvVars = [];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingEnvVars.push(varName);
    console.log(`  ❌ ${varName}: NOT SET`);
  } else {
    console.log(`  ✅ ${varName}: SET`);
  }
});

if (missingEnvVars.length > 0) {
  console.log(`\n⚠️  Missing ${missingEnvVars.length} required environment variables!`);
}

// Check for missing page files
console.log('\n2. Checking Page Files:');
const appDir = path.join(__dirname, '../src/app');
const routes = [
  'customer-service/contact',
  'customer-service/faq',
  'customer-service',
  'customer-service/size-guide',
  'local-cart-test',
  'order-confirmed',
  'privacy-policy',
  'return-policy',
  'search',
  'shipping-policy',
  'sign-in',
  'sign-up',
  'terms-of-service',
  'test-auth',
  'test-auth/success',
  'test',
  'wishlist',
  'woocommerce-cart-test',
  'woocommerce-checkout-test',
  'woocommerce-test',
  'woocommerce-test/success'
];

const missingPages = [];
routes.forEach(route => {
  const pagePath = path.join(appDir, route, 'page.tsx');
  const pagePathJs = path.join(appDir, route, 'page.js');
  
  if (!fs.existsSync(pagePath) && !fs.existsSync(pagePathJs)) {
    missingPages.push(route);
    console.log(`  ❌ /${route}/page.tsx: NOT FOUND`);
  } else {
    console.log(`  ✅ /${route}/page.tsx: EXISTS`);
  }
});

if (missingPages.length > 0) {
  console.log(`\n⚠️  Missing ${missingPages.length} page files!`);
}

// Check TypeScript configuration
console.log('\n3. TypeScript Configuration:');
const tsConfigPath = path.join(__dirname, '../tsconfig.json');
if (fs.existsSync(tsConfigPath)) {
  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
  console.log(`  ✅ tsconfig.json exists`);
  console.log(`  - Strict mode: ${tsConfig.compilerOptions.strict}`);
  console.log(`  - Skip lib check: ${tsConfig.compilerOptions.skipLibCheck}`);
} else {
  console.log(`  ❌ tsconfig.json: NOT FOUND`);
}

// Check Next.js configuration
console.log('\n4. Next.js Configuration:');
const nextConfigPath = path.join(__dirname, '../next.config.js');
if (fs.existsSync(nextConfigPath)) {
  console.log(`  ✅ next.config.js exists`);
  const nextConfig = require(nextConfigPath);
  console.log(`  - TypeScript ignoreBuildErrors: ${nextConfig.typescript?.ignoreBuildErrors}`);
  console.log(`  - ESLint ignoreDuringBuilds: ${nextConfig.eslint?.ignoreDuringBuilds}`);
  console.log(`  - Output mode: ${nextConfig.output || 'default'}`);
} else {
  console.log(`  ❌ next.config.js: NOT FOUND`);
}

// Summary
console.log('\n=== Summary ===');
if (missingEnvVars.length === 0 && missingPages.length === 0) {
  console.log('✅ All checks passed!');
} else {
  console.log('❌ Issues found:');
  if (missingEnvVars.length > 0) {
    console.log(`  - ${missingEnvVars.length} missing environment variables`);
    console.log(`    Add these to your Vercel project settings.`);
  }
  if (missingPages.length > 0) {
    console.log(`  - ${missingPages.length} missing page files`);
    console.log(`    These routes need page.tsx files.`);
  }
}

// Exit with error if issues found
if (missingEnvVars.length > 0 || missingPages.length > 0) {
  process.exit(1);
}