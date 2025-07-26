/**
 * Script to verify and configure WooCommerce guest checkout settings
 * 
 * This script provides instructions on how to properly configure
 * WooCommerce to allow guest checkout without login prompts.
 */

console.log('='.repeat(80));
console.log('WOOCOMMERCE GUEST CHECKOUT CONFIGURATION GUIDE');
console.log('='.repeat(80));
console.log('\nTo ensure guest checkout works properly in WooCommerce, follow these steps:\n');

console.log('1. Log in to your WordPress admin dashboard');
console.log('2. Navigate to: WooCommerce > Settings > Accounts & Privacy');
console.log('3. Under "Guest checkout" section:');
console.log('   - Check "Allow customers to place orders without an account"');
console.log('   - Check "Allow customers to log into an existing account during checkout"');
console.log('   - Uncheck "Force secure checkout" if you\'re testing on a non-HTTPS environment');
console.log('4. Click "Save changes" at the bottom of the page');

console.log('\nAdditional settings that might help:');
console.log('5. Navigate to: WooCommerce > Settings > Advanced > Checkout');
console.log('6. Ensure "Guest Checkout" is enabled');
console.log('7. Click "Save changes" at the bottom of the page');

console.log('\nIf you\'re still experiencing issues:');
console.log('1. Check if you have any WooCommerce plugins that might be forcing login');
console.log('2. Verify your theme doesn\'t have custom checkout modifications');
console.log('3. Try disabling all non-essential plugins temporarily to identify conflicts');
console.log('4. Clear your browser cache and cookies, then try again');
console.log('5. Test in an incognito/private browsing window');

console.log('\nThe URL parameters we\'re using to enable guest checkout are:');
console.log('- guest_checkout=yes');
console.log('- checkout_woocommerce_checkout_login_reminder=0');

console.log('\nThese should bypass the login requirement when properly configured.');
console.log('='.repeat(80)); 