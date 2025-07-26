# Fixing WooCommerce Guest Checkout CORS Issues

This document explains how to fix the common CORS issues and login redirects that occur when implementing a headless WooCommerce checkout with Next.js.

## The Problem

When implementing a headless WooCommerce checkout with Next.js, you may encounter the following issues:

1. **CORS Errors**: Requests from your Next.js frontend to the WooCommerce API are blocked due to CORS policy.
2. **Login Redirects**: Users are redirected to the WordPress login page when trying to checkout as guests.
3. **Session Management Issues**: Cart and checkout sessions aren't properly maintained across the headless frontend.
4. **Authentication Problems**: API requests that require authentication fail due to missing or incorrect credentials.

These issues occur because WooCommerce was originally designed for traditional WordPress themes rather than headless architectures.

## Root Causes

### CORS Issues

By default, WordPress and WooCommerce don't include the proper CORS headers in API responses. When your Next.js frontend makes requests to the WooCommerce API, the browser blocks these requests due to the Same-Origin Policy.

Key CORS headers that need to be set:
- `Access-Control-Allow-Origin`: Must match your frontend origin or be `*` (not recommended for production)
- `Access-Control-Allow-Credentials`: Must be `true` to allow cookies/auth
- `Access-Control-Allow-Methods`: Must include the HTTP methods you're using
- `Access-Control-Allow-Headers`: Must include headers like `Content-Type` and `Authorization`

### Login Redirects

WooCommerce has several settings and filters that can force users to log in before checkout:
- `woocommerce_enable_guest_checkout` option may be set to `no`
- `woocommerce_checkout_registration_required` filter may return `true`
- `wc_prevent_admin_access` function may redirect users to login

### Session Management

WooCommerce uses cookies to maintain cart and checkout sessions. In a headless setup:
- Cookies may not be properly sent with API requests
- The `credentials: 'include'` option may be missing in fetch requests
- Session tokens may not be properly forwarded between the frontend and backend

## The Solution

We've implemented a comprehensive solution with two main components:

1. **WordPress Plugin**: `woo-guest-checkout-fix.php` - Fixes backend issues
2. **Next.js API Proxy**: `src/app/api/graphql/route.ts` - Handles CORS and authentication

### WordPress Plugin Implementation

The `woo-guest-checkout-fix.php` plugin does the following:

1. **Adds CORS Headers**:
   - Sets `Access-Control-Allow-Origin` based on the request origin
   - Sets `Access-Control-Allow-Credentials: true`
   - Sets `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`
   - Adds `Vary: Origin` header for proper caching

2. **Disables Login Redirects**:
   - Removes `wc_auth_check_login_redirect` filter
   - Sets `woocommerce_checkout_must_be_logged_in` to `false`
   - Sets `woocommerce_checkout_registration_required` to `false`

3. **Forces Guest Checkout**:
   - Sets `woocommerce_enable_guest_checkout` option to `yes`
   - Sets `woocommerce_enable_checkout_login_reminder` option to `no`

4. **Adds Custom API Endpoints**:
   - `/wp-json/ankkor/v1/guest-checkout`: Returns a properly formatted guest checkout URL
   - `/wp-json/ankkor/v1/fix-checkout`: Sets session variables to force guest checkout

### Next.js API Proxy Implementation

The `src/app/api/graphql/route.ts` file creates a proxy for GraphQL requests that:

1. **Handles CORS Properly**:
   - Sets CORS headers based on the request origin
   - Includes credentials in requests to WooCommerce
   - Properly handles preflight OPTIONS requests

2. **Manages Authentication**:
   - Forwards session tokens and cookies to WooCommerce
   - Returns session tokens and cookies from WooCommerce responses

3. **Provides Error Handling**:
   - Catches and formats errors from the WooCommerce API
   - Returns appropriate HTTP status codes

## Implementation Steps

### 1. Install the WordPress Plugin

1. Upload `woo-guest-checkout-fix.php` to your WordPress site's `wp-content/plugins` directory
2. Activate the plugin from the WordPress admin dashboard

### 2. Update Next.js API Proxy

1. Ensure `src/app/api/graphql/route.ts` is properly configured
2. Update the GraphQL endpoint URL if needed

### 3. Update Frontend Code

1. Ensure all fetch requests include `credentials: 'include'`
2. Use the Next.js API proxy for GraphQL requests
3. Add guest checkout parameters to checkout URLs

### 4. Test the Implementation

1. Run the test script: `node scripts/test-guest-checkout.js`
2. Check for CORS errors in the browser console
3. Test guest checkout in an incognito/private browser window

## Checkout URL Parameters

For guest checkout to work properly, use the following URL parameters:

```
/checkout/?guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0&skip_login=1&force_guest_checkout=1
```

These parameters ensure that:
- Guest checkout is enabled
- Login reminders are disabled
- Account creation is optional
- Login is skipped
- Guest checkout is forced

## Troubleshooting

If you're still experiencing issues:

1. **Check Plugin Activation**: Ensure the WooCommerce Guest Checkout Fix plugin is activated.

2. **Verify WooCommerce Settings**: Go to WooCommerce > Settings > Accounts & Privacy and ensure "Allow customers to place orders without an account" is checked.

3. **Clear Caches**: Clear WordPress cache, browser cache, and any CDN cache.

4. **Check Browser Console**: Look for CORS or other JavaScript errors in the browser console.

5. **Test in Incognito Mode**: Use an incognito/private browser window to ensure you're not already logged in.

6. **Check Server Logs**: Look for PHP errors in the server logs.

7. **Verify Headers**: Use browser developer tools to check if the proper CORS headers are being sent.

## Additional Resources

- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [WPGraphQL Documentation](https://www.wpgraphql.com/docs)
- [WooGraphQL Documentation](https://woographql.com/docs)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)
- [CORS MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) 