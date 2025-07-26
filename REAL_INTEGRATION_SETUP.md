# Real Integration Setup Guide

## Overview

This guide will help you set up all the real integrations for the custom checkout flow. All mock data has been replaced with actual API calls.

## 🔧 Environment Variables Setup

Update your `.env.local` file with the following variables:

```bash
# Existing WordPress/WooCommerce Configuration
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret_here

# Razorpay Configuration (REQUIRED)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Shipping Configuration
SHIPPING_PROVIDER=woocommerce
# Options: woocommerce, delhivery, bluedart

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Webhook Security (Optional)
WOOCOMMERCE_ORDER_WEBHOOK_SECRET=your_webhook_secret_here
```

## 🏪 Razorpay Setup

### 1. Create Razorpay Account
1. Go to [razorpay.com](https://razorpay.com)
2. Sign up for an account
3. Complete KYC verification
4. Get your API keys from Dashboard > Settings > API Keys

### 2. Configure Razorpay
1. **Test Mode**: Use `rzp_test_` keys for testing
2. **Live Mode**: Use `rzp_live_` keys for production
3. **Webhooks**: Set up webhooks for payment notifications (optional)

### 3. Test Payment Methods
- **Test Cards**: Use Razorpay test card numbers
- **Test UPI**: Use `success@razorpay` for successful payments
- **Test Netbanking**: Use any test bank credentials

## 🛒 WooCommerce Setup

### 1. API Credentials
1. Go to WooCommerce > Settings > Advanced > REST API
2. Create new API key with Read/Write permissions
3. Copy Consumer Key and Consumer Secret

### 2. Shipping Zones (Required for real shipping rates)
1. Go to WooCommerce > Settings > Shipping
2. Create shipping zones for different regions
3. Add shipping methods to each zone:
   - **Flat Rate**: Fixed shipping cost
   - **Free Shipping**: Free shipping with minimum order
   - **Local Pickup**: Store pickup option

### 3. Products Setup
Ensure your products have:
- Correct prices
- Weight (for shipping calculation)
- Stock management enabled

## 📦 Shipping Integration Options

### Option 1: WooCommerce Shipping (Recommended)
- Uses your existing WooCommerce shipping zones
- Automatically calculates rates based on your settings
- No additional setup required

### Option 2: External Shipping Provider
Set `SHIPPING_PROVIDER=delhivery` or `SHIPPING_PROVIDER=bluedart`
- Requires additional API integration
- More accurate real-time rates
- Better tracking capabilities

## 🧪 Testing the Integration

### 1. Test Environment Setup
```bash
# Use test credentials
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_test_key
RAZORPAY_KEY_SECRET=your_test_secret
```

### 2. Test Flow
1. **Add Products**: Add items to cart
2. **Checkout**: Go to checkout page
3. **Shipping Address**: Fill valid Indian address with 6-digit pincode
4. **Shipping Options**: Verify real shipping rates load
5. **Payment**: Use Razorpay test credentials
6. **Verification**: Check WooCommerce orders dashboard

### 3. Test Cases
- **Valid Pincode**: 110001, 400001, 560001
- **Invalid Pincode**: 000000, 123
- **Different Order Values**: Test free shipping thresholds
- **Payment Failure**: Use Razorpay failure test cards

## 🔒 Security Considerations

### 1. API Keys
- Never commit API keys to version control
- Use different keys for test/production
- Rotate keys regularly

### 2. Payment Verification
- All payments are verified server-side
- Razorpay signatures are validated
- Invalid payments are rejected

### 3. Order Security
- Orders are created only after payment verification
- All input data is validated
- Error handling prevents data leaks

## 🚀 Production Deployment

### 1. Environment Variables
```bash
# Production Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_live_key
RAZORPAY_KEY_SECRET=your_live_secret

# Production WooCommerce
NEXT_PUBLIC_WORDPRESS_URL=https://your-production-site.com
```

### 2. SSL Certificate
- Ensure your site has valid SSL
- Razorpay requires HTTPS for live payments

### 3. Webhook Setup (Optional)
- Set up Razorpay webhooks for payment notifications
- Configure webhook secret for security

## 📊 Monitoring & Logs

### 1. Payment Logs
- Check browser console for payment flow
- Monitor Razorpay dashboard for transactions
- Check WooCommerce orders for successful orders

### 2. Error Handling
- All errors are logged to console
- User-friendly error messages displayed
- Failed payments don't create orders

### 3. Analytics
- Track conversion rates
- Monitor payment success rates
- Analyze shipping preferences

## 🆘 Troubleshooting

### Common Issues

1. **"Payment gateway not configured"**
   - Check RAZORPAY_KEY_SECRET is set
   - Verify key format (starts with rzp_)

2. **"No shipping options available"**
   - Check WooCommerce shipping zones
   - Verify pincode format (6 digits)
   - Check WOOCOMMERCE_CONSUMER_KEY/SECRET

3. **"Failed to create order"**
   - Check WooCommerce API credentials
   - Verify product IDs exist
   - Check WooCommerce error logs

4. **Payment successful but no order**
   - Check payment verification logs
   - Verify WooCommerce API connectivity
   - Check signature verification

### Debug Mode
Enable detailed logging by adding to console:
```javascript
localStorage.setItem('debug', 'true');
```

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Test with Razorpay test credentials first
4. Check WooCommerce and Razorpay dashboards

## 🎯 Next Steps

1. Set up all environment variables
2. Test with Razorpay test credentials
3. Configure WooCommerce shipping zones
4. Test complete checkout flow
5. Switch to live credentials for production
