# Forgot Password Implementation

## Overview

This document describes the implementation of the forgot password functionality for the Ankkor e-commerce application using WooCommerce, WordPress, and WPGraphQL.

## Architecture

The forgot password flow consists of:

1. **Backend API Endpoints** - Next.js API routes handling GraphQL mutations
2. **Frontend Pages** - React components for user interaction
3. **WordPress Integration** - WPGraphQL mutations for password reset
4. **Email System** - WordPress native email system for reset notifications

## Implementation Details

### API Endpoints

#### Forgot Password Request
- **Endpoint**: `POST /api/auth`
- **Action**: `forgot-password`
- **Payload**:
  ```json
  {
    "action": "forgot-password",
    "email": "user@example.com"
  }
  ```
- **GraphQL Mutation**: `sendPasswordResetEmail`

#### Reset Password
- **Endpoint**: `POST /api/auth`
- **Action**: `reset-password`
- **Payload**:
  ```json
  {
    "action": "reset-password",
    "key": "reset-key-from-email",
    "login": "username-or-email",
    "password": "new-password"
  }
  ```
- **GraphQL Mutation**: `resetUserPassword`

### Frontend Pages

#### Forgot Password Page (`/forgot-password`)
- Email input form with validation
- Success/error message handling
- Responsive design matching site theme
- Security-focused messaging (no email enumeration)

#### Reset Password Page (`/reset-password`)
- URL parameter extraction (`key`, `login`)
- Password strength validation
- Confirm password matching
- Success state with redirect to login

### GraphQL Mutations

```graphql
# Send Password Reset Email
mutation SendPasswordResetEmail($input: SendPasswordResetEmailInput!) {
  sendPasswordResetEmail(input: $input) {
    success
    user {
      id
      email
    }
  }
}

# Reset User Password
mutation ResetUserPassword($input: ResetUserPasswordInput!) {
  resetUserPassword(input: $input) {
    user {
      id
      email
      firstName
      lastName
    }
  }
}
```

## Security Considerations

### Email Enumeration Prevention
- Always returns success response regardless of email existence
- Consistent response timing to prevent timing attacks
- Generic success messages

### Password Validation
- Minimum 8 characters
- Requires uppercase, lowercase, and numeric characters
- Real-time validation feedback
- Secure password visibility toggles

### Token Security
- Reset keys expire automatically (WordPress default: 24 hours)
- One-time use tokens
- Secure parameter validation

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── route.ts          # Enhanced with forgot password
│   ├── forgot-password/
│   │   └── page.tsx              # Forgot password form
│   └── reset-password/
│       └── page.tsx              # Reset password form
├── components/
│   └── auth/
│       └── AuthModal.tsx         # Updated with forgot password link
└── scripts/
    ├── test-forgot-password.mjs  # Basic API testing
    └── test-full-auth-flow.mjs   # Comprehensive testing
```

## Testing

### CLI Testing
```bash
# Test basic forgot password functionality
npm run test:forgot-password

# Test full authentication flow
npm run test:full-auth
```

### Manual Testing
1. Navigate to `/forgot-password`
2. Enter email address
3. Check WordPress admin for password reset email
4. Follow email link to `/reset-password`
5. Enter new password and confirm

## WordPress Configuration

### Required Plugins
- **WPGraphQL** - For GraphQL API functionality
- **WP GraphQL JWT Authentication** - For token-based auth

### Email Template Customization

To customize the password reset email template, add this to your theme's `functions.php`:

```php
add_filter('retrieve_password_message', 'custom_password_reset_message', 10, 4);

function custom_password_reset_message($message, $key, $user_login, $user_data) {
    $reset_url = "http://localhost:3000/reset-password?key=" . $key . "&login=" . rawurlencode($user_login);
    
    $message = "Hello " . $user_data->display_name . ",\n\n";
    $message .= "Someone has requested a password reset for the following account:\n\n";
    $message .= "Site Name: " . get_option('blogname') . "\n";
    $message .= "Username: " . $user_login . "\n\n";
    $message .= "If this was a mistake, ignore this email and nothing will happen.\n\n";
    $message .= "To reset your password, visit the following address:\n\n";
    $message .= $reset_url . "\n\n";
    $message .= "This link will expire in 24 hours.\n";
    
    return $message;
}
```

### SMTP Configuration
For production, configure SMTP in WordPress:
- Use plugins like WP Mail SMTP
- Configure with your email service provider
- Test email delivery

## Environment Variables

Ensure these are configured:

```env
WOOCOMMERCE_GRAPHQL_URL=https://your-wordpress-site.com/graphql
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Production Deployment

### Security Headers
Add security headers for password reset pages:
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(forgot-password|reset-password)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}
```

### Rate Limiting
Consider implementing rate limiting for password reset requests:
- Maximum 5 requests per IP per hour
- Use Redis or similar for rate limiting storage
- Return consistent responses even when rate limited

### Monitoring
Track password reset metrics:
- Reset request frequency
- Success/failure rates
- Email delivery status
- User conversion from reset to login

## Troubleshooting

### Common Issues

1. **GraphQL Connection Errors**
   - Verify WOOCOMMERCE_GRAPHQL_URL is correct
   - Check WPGraphQL plugin is active
   - Ensure WordPress site is accessible

2. **Email Not Sent**
   - Check WordPress email configuration
   - Verify SMTP settings
   - Check spam folders
   - Test with WordPress default email

3. **Reset Link Invalid**
   - Check URL parameters are preserved
   - Verify reset key hasn't expired
   - Ensure user exists in WordPress

4. **Frontend Page 404**
   - Verify Next.js routing is correct
   - Check build and deployment
   - Ensure pages are properly exported

### Debug Mode
Enable debug logging in development:
```javascript
// In route.ts
console.log('Password reset debug:', {
  key: resetKey,
  login: userLogin,
  timestamp: new Date().toISOString()
});
```

## Future Enhancements

### Potential Improvements
1. **Email Templates** - HTML email templates with branding
2. **Multi-language Support** - Internationalization for reset pages
3. **Two-Factor Authentication** - Additional security layer
4. **Account Recovery** - Alternative recovery methods
5. **Audit Logging** - Comprehensive security logging

### Integration Opportunities
1. **SMS Reset** - Phone-based password reset
2. **Social Recovery** - OAuth provider integration
3. **Security Questions** - Alternative authentication methods
4. **Biometric Reset** - Modern authentication methods

## Testing Coverage

- ✅ API endpoint functionality
- ✅ GraphQL mutation execution  
- ✅ Frontend page accessibility
- ✅ Form validation
- ✅ Error handling
- ✅ Security measures
- ⚠️ Email delivery (requires WordPress setup)
- ⚠️ End-to-end user flow (requires full environment)

## Support

For implementation support or bug reports, refer to:
- WordPress WPGraphQL documentation
- Next.js API routes documentation
- WooCommerce developer resources
- Project issue tracker