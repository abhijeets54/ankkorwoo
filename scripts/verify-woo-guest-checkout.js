/**
 * Script to verify and fix WooCommerce guest checkout settings
 * 
 * This script checks if guest checkout is properly enabled in your WooCommerce
 * installation and provides instructions on how to fix it if it's not.
 */

console.log('='.repeat(80));
console.log('WOOCOMMERCE GUEST CHECKOUT VERIFICATION');
console.log('='.repeat(80));
console.log('\nThis script will help you verify and fix guest checkout settings in WooCommerce.\n');

console.log('STEP 1: Verify WooCommerce Account Settings');
console.log('-'.repeat(50));
console.log('1. Log in to your WordPress admin dashboard');
console.log('2. Navigate to: WooCommerce > Settings > Accounts & Privacy');
console.log('3. Under "Guest checkout" section, ensure these settings are configured:');
console.log('   ✓ "Allow customers to place orders without an account" should be CHECKED');
console.log('   ✓ "Allow customers to log into an existing account during checkout" should be CHECKED');
console.log('   ✓ "Allow customers to create an account during checkout" should be CHECKED');
console.log('   ✓ "Allow customers to create an account on the "My account" page" should be CHECKED');
console.log('4. Click "Save changes" if you made any changes\n');

console.log('STEP 2: Verify WooCommerce Checkout Page Settings');
console.log('-'.repeat(50));
console.log('1. Navigate to: Pages > All Pages');
console.log('2. Find the "Checkout" page and click "Edit"');
console.log('3. Ensure the page contains the [woocommerce_checkout] shortcode');
console.log('4. If using a page builder, ensure no custom login forms are added to the checkout page');
console.log('5. Update the page if you made any changes\n');

console.log('STEP 3: Check for Plugin Conflicts');
console.log('-'.repeat(50));
console.log('1. Navigate to: Plugins > Installed Plugins');
console.log('2. Temporarily deactivate these plugins if installed (they may interfere with guest checkout):');
console.log('   - WooCommerce Force Login');
console.log('   - WooCommerce Login Redirect');
console.log('   - Any membership or subscription plugins that might force login');
console.log('3. Test guest checkout after deactivating these plugins\n');

console.log('STEP 4: Verify WPGraphQL Settings');
console.log('-'.repeat(50));
console.log('1. Navigate to: GraphQL > Settings > WooCommerce');
console.log('2. Ensure "Disable GQL Session Handler" is UNCHECKED');
console.log('3. Click "Save Changes" if you made any changes\n');

console.log('STEP 5: Test Guest Checkout');
console.log('-'.repeat(50));
console.log('1. Open an incognito/private browser window');
console.log('2. Visit your store and add a product to cart');
console.log('3. Proceed to checkout');
console.log('4. Verify you can enter checkout details without being asked to log in\n');

console.log('STEP 6: Update Frontend Code');
console.log('-'.repeat(50));
console.log('Ensure your frontend code is properly configured for guest checkout:');
console.log('1. The checkout URL should include these parameters:');
console.log('   - guest_checkout=yes');
console.log('   - checkout_woocommerce_checkout_login_reminder=0');
console.log('   - create_account=0 (optional, if you want to hide account creation)');
console.log('2. Example URL: https://your-store.com/checkout/?guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0\n');

console.log('If you continue to experience issues after following these steps, please check:');
console.log('1. Your server logs for any PHP errors');
console.log('2. Browser console for JavaScript errors');
console.log('3. WooCommerce > Status > Logs for any relevant error messages\n');

console.log('='.repeat(80)); 