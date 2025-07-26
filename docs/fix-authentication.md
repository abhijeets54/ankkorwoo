# Fixing WooCommerce Authentication Issues

This document provides steps to resolve authentication issues with the WooCommerce headless setup.

## Issue Diagnosis

The sign-in and sign-up functionality is failing with GraphQL errors. Based on the error logs, there appears to be an issue with the JWT authentication configuration.

## Solution Steps

### 1. Verify WordPress Configuration

1. **Check WPGraphQL JWT Authentication Plugin**
   
   Ensure the WPGraphQL JWT Authentication plugin is properly installed and activated:
   
   - Log in to WordPress admin
   - Go to Plugins > Installed Plugins
   - Verify "WPGraphQL JWT Authentication" is activated

2. **Configure JWT Secret Key**
   
   The JWT secret key must be properly configured in wp-config.php:
   
   ```php
   // Add this line to wp-config.php before "That's all, stop editing!" line
   define('GRAPHQL_JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
   ```
   
   Use the same secret key that's in your .env.local file:
   ```
   WOOCOMMERCE_JWT_SECRET=eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTc1MDU0MDYxMiwiaWF0IjoxNzUwNTQwNjEyfQ.L5aHt9vri8jGReKHMb4DdDOLMyFLDMFDvqsz7q1V2yI
   ```

3. **Enable CORS Support**
   
   Add the following to your .htaccess file (for Apache) or Nginx configuration:
   
   For Apache:
   ```apache
   <IfModule mod_headers.c>
     Header set Access-Control-Allow-Origin "*"
     Header set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
     Header set Access-Control-Allow-Credentials "true"
     Header set Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce, X-JWT-Auth, X-JWT-Refresh, woocommerce-session"
     Header set Access-Control-Expose-Headers "X-JWT-Refresh, woocommerce-session"
   </IfModule>
   ```
   
   For Nginx:
   ```nginx
   add_header Access-Control-Allow-Origin "*";
   add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
   add_header Access-Control-Allow-Credentials "true";
   add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce, X-JWT-Auth, X-JWT-Refresh, woocommerce-session";
   add_header Access-Control-Expose-Headers "X-JWT-Refresh, woocommerce-session";
   ```

### 2. Verify WooGraphQL Configuration

1. **Check WooGraphQL Settings**
   
   - Go to GraphQL > Settings > WooCommerce
   - Make sure "Disable GQL Session Handler" is **unchecked**
   - Leave other options at their default settings

2. **Verify User Permissions**
   
   - Go to Users > All Users
   - Ensure your test user has proper permissions (Customer role is sufficient)

### 3. Run Verification Script

Run the JWT verification script to test if the authentication is working:

```bash
npm run verify-jwt
```

This script will:
1. Test the login mutation
2. Verify the JWT token is received
3. Test an authenticated request

### 4. Common Issues and Solutions

1. **"Internal server error" during login**
   - Check WordPress error logs for PHP errors
   - Verify the JWT secret key is properly configured
   - Make sure the WPGraphQL JWT Authentication plugin is activated

2. **"Unknown argument" errors**
   - This indicates you're using outdated query syntax
   - Update your GraphQL queries to match the latest WooGraphQL schema

3. **CORS Issues**
   - Ensure CORS headers are properly configured
   - Check that the Origin header is being sent from your frontend

4. **Session Issues**
   - Make sure "Disable GQL Session Handler" is unchecked in WooGraphQL settings
   - Verify cookies are being properly handled in your browser

### 5. Testing User Account

Create a test user in WordPress:

1. Go to Users > Add New
2. Create a user with the following details:
   - Username: test@example.com
   - Email: test@example.com
   - Password: (use a strong password)
   - Role: Customer

3. Update your .env.local file with the test credentials:
   ```
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=your-password
   ```

### 6. Restart Development Server

After making these changes, restart your Next.js development server:

```bash
npm run dev
```

## Additional Resources

- [WPGraphQL Documentation](https://www.wpgraphql.com/docs/)
- [WooGraphQL Documentation](https://woographql.com/docs/)
- [JWT Authentication for WPGraphQL](https://github.com/wp-graphql/wp-graphql-jwt-authentication)
- [WooCommerce REST API Documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/) 