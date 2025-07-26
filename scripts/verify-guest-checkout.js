#!/usr/bin/env node

/**
 * WooCommerce Guest Checkout Verification Script
 * This script will help you verify that guest checkout is properly enabled
 * in your WooCommerce installation.
 */

console.log('================================================================================');
console.log('WOOCOMMERCE GUEST CHECKOUT VERIFICATION AND TROUBLESHOOTING');
console.log('================================================================================\n');

// Display instructions
console.log(`This script will help you check and troubleshoot guest checkout settings in your WooCommerce site.
Follow these steps carefully to ensure guest checkout works properly:\n`);

// 1. Check WooCommerce Account & Privacy Settings
console.log('STEP 1: Check WooCommerce Account & Privacy Settings');
console.log('--------------------------------------------------');
console.log('1. Log in to your WordPress admin dashboard.');
console.log('2. Go to: WooCommerce > Settings > Accounts & Privacy.');
console.log('3. In the "Guest checkout" section, ensure the following option is CHECKED:');
console.log('   ✓ "Allow customers to place orders without an account"');
console.log('4. In the "Account creation" section, ensure these options are as follows:');
console.log('   ✓ "Allow customers to create an account during checkout" (checked)');
console.log('   ✓ "When creating an account, send the new user a link to set their password" (checked)');
console.log('5. Click "Save changes" to apply your settings.\n');

// 2. Check for Plugin Conflicts
console.log('STEP 2: Check for Plugin Conflicts');
console.log('--------------------------------------------------');
console.log('1. Navigate to: Plugins > Installed Plugins');
console.log('2. Temporarily deactivate these plugins if installed:');
console.log('   - WooCommerce Force Login');
console.log('   - WooCommerce Login Redirect');
console.log('   - Any membership or subscription plugins that might force login');
console.log('   - Any checkout customization plugins');
console.log('3. Test guest checkout after deactivating these plugins\n');

// 3. Check WPGraphQL Settings
console.log('STEP 3: Check WPGraphQL Settings');
console.log('--------------------------------------------------');
console.log('1. Navigate to: GraphQL > Settings');
console.log('2. Ensure "Public Introspection" is ENABLED');
console.log('3. Go to: GraphQL > Settings > WooCommerce');
console.log('4. Ensure "Disable GQL Session Handler" is UNCHECKED');
console.log('5. Click "Save Changes" if you made any changes\n');

// 4. Check .htaccess for Blocking Rules
console.log('STEP 4: Check .htaccess for Blocking Rules');
console.log('--------------------------------------------------');
console.log('1. Access your site\'s .htaccess file via FTP or file manager');
console.log('2. Look for any rules that might be blocking access to checkout pages or APIs');
console.log('3. Especially check for rules restricting access to:');
console.log('   - /checkout/');
console.log('   - /wp-json/');
console.log('   - /graphql');
console.log('4. If you find restrictive rules, modify them to allow access to these endpoints\n');

// 5. Test with Direct URL Parameters
console.log('STEP 5: Test with Direct URL Parameters');
console.log('--------------------------------------------------');
console.log('Open your browser and try accessing this URL directly (replace with your domain):');
console.log('https://your-domain.com/checkout/?guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0&skip_login=1&force_guest_checkout=1\n');

// 6. Server-Side Fix for Guest Checkout
console.log('STEP 6: Add Server-Side Fix for Guest Checkout');
console.log('--------------------------------------------------');
console.log('Add the following code to your theme\'s functions.php file or a custom plugin:');
console.log(`
/**
 * Force guest checkout and bypass login/registration
 */
add_filter('woocommerce_checkout_registration_required', '__return_false');
add_filter('woocommerce_checkout_registration_enabled', '__return_false');
add_filter('woocommerce_checkout_is_registration_required', '__return_false');

// Skip login/registration process completely
add_action('template_redirect', function() {
    if (isset($_GET['force_guest_checkout']) && $_GET['force_guest_checkout'] == '1') {
        // Force guest checkout
        WC()->session->set('force_guest_checkout', true);
    }
}, 5);

// Allow checkout without login even for registered users
add_filter('woocommerce_checkout_registration_required', function($registration_required) {
    if (isset($_GET['force_guest_checkout']) && $_GET['force_guest_checkout'] == '1') {
        return false;
    }
    return $registration_required;
});

// Force guest checkout mode
add_filter('pre_option_woocommerce_enable_guest_checkout', function($value) {
    if (isset($_GET['guest_checkout']) && $_GET['guest_checkout'] == 'yes') {
        return 'yes';
    }
    return $value;
});
`);

console.log('\n7. Click "Save" to apply the changes\n');

// Additional Instructions
console.log('STEP 7: Update Frontend Checkout URLs');
console.log('--------------------------------------------------');
console.log('Make sure all checkout links in your frontend code include these parameters:');
console.log('- guest_checkout=yes');
console.log('- checkout_woocommerce_checkout_login_reminder=0');
console.log('- create_account=0');
console.log('- skip_login=1');
console.log('- force_guest_checkout=1\n');

console.log('Example URL:');
console.log('https://your-domain.com/checkout/?guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0&skip_login=1&force_guest_checkout=1\n');

console.log('STEP 8: Clear All Caches');
console.log('--------------------------------------------------');
console.log('1. Clear WordPress cache');
console.log('2. Clear WooCommerce cache');
console.log('3. Clear browser cache and cookies');
console.log('4. If using a caching plugin (WP Super Cache, W3 Total Cache, etc.), purge all caches');
console.log('5. If using a CDN, purge CDN cache\n');

console.log('After completing these steps, try the guest checkout process again in an incognito browser window.\n');

console.log('If issues persist, check:');
console.log('1. Server error logs');
console.log('2. WooCommerce error logs (WooCommerce > Status > Logs)');
console.log('3. Browser console for JavaScript errors');
console.log('4. Network requests in browser developer tools\n');

console.log('================================================================================'); 