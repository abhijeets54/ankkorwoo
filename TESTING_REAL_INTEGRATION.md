# Testing Real Integration Guide

## 🎯 Overview

This guide provides step-by-step instructions to test the complete real integration of the custom checkout flow with actual Razorpay and WooCommerce APIs.

## 🔧 Pre-Testing Setup

### 1. Environment Configuration
Ensure your `.env.local` has real credentials:

```bash
# Razorpay Test Credentials
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_actual_test_key
RAZORPAY_KEY_SECRET=your_actual_test_secret

# WooCommerce Credentials
NEXT_PUBLIC_WORDPRESS_URL=https://your-wordpress-site.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_actual_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=cs_your_actual_consumer_secret
```

### 2. WooCommerce Setup Verification
1. **Products**: Ensure you have products with proper prices and stock
2. **Shipping Zones**: Set up at least one shipping zone with methods
3. **API Access**: Verify REST API is enabled and keys work

### 3. Razorpay Setup Verification
1. **Test Mode**: Ensure you're using test keys (rzp_test_)
2. **Dashboard Access**: Can access Razorpay dashboard
3. **Test Cards**: Have Razorpay test card numbers ready

## 🧪 Testing Scenarios

### Scenario 1: Successful Order Flow

#### Step 1: Add Products to Cart
1. Navigate to your product pages
2. Add 2-3 different products to cart
3. Verify cart shows correct items and prices
4. **Expected**: Cart displays items with accurate pricing

#### Step 2: Initiate Checkout
1. Click "Proceed to Checkout" from cart
2. Ensure you're logged in (required for checkout)
3. **Expected**: Redirects to `/checkout` page

#### Step 3: Fill Shipping Address
1. Fill all required fields:
   - First Name: John
   - Last Name: Doe
   - Address: 123 Test Street
   - City: Mumbai
   - State: Maharashtra
   - Pincode: 400001 (use valid Mumbai pincode)
   - Phone: 9876543210
2. Click "Save Address & Continue"
3. **Expected**: Address saved, shipping options section enabled

#### Step 4: Select Shipping Method
1. Wait for shipping options to load (should be automatic)
2. Verify multiple shipping options appear
3. Select a shipping method
4. **Expected**: Order total updates with shipping cost

#### Step 5: Process Payment
1. Click "Proceed to Pay"
2. Razorpay modal should open
3. Use test payment details:
   - **Card**: 4111 1111 1111 1111
   - **Expiry**: Any future date
   - **CVV**: 123
   - **Name**: Test User
4. Complete payment
5. **Expected**: Payment success, redirect to order confirmation

#### Step 6: Verify Order Creation
1. Check order confirmation page shows order ID
2. Login to WooCommerce admin
3. Go to WooCommerce > Orders
4. **Expected**: New order appears with "Processing" status

### Scenario 2: Shipping Rate Testing

#### Test Different Pincodes
1. **Metro Areas**: 110001 (Delhi), 400001 (Mumbai), 560001 (Bangalore)
2. **Non-Metro**: 302001 (Jaipur), 500001 (Hyderabad)
3. **Invalid**: 000000, 12345

#### Expected Results
- **Metro**: Should show express and same-day delivery options
- **Non-Metro**: Should show standard and express options
- **Invalid**: Should show error message

### Scenario 3: Error Handling

#### Test 1: Invalid Pincode
1. Enter pincode: 12345
2. **Expected**: Error message "Please enter a valid 6-digit pincode"

#### Test 2: No Shipping Address
1. Try to pay without filling address
2. **Expected**: Error "Please fill in your shipping address"

#### Test 3: No Shipping Method Selected
1. Fill address but don't select shipping
2. Try to pay
3. **Expected**: Error "Please select a shipping method"

#### Test 4: Payment Failure
1. Use Razorpay failure test card: 4000 0000 0000 0002
2. **Expected**: Payment fails, no order created, user stays on checkout

#### Test 5: Network Error Simulation
1. Disconnect internet during payment
2. **Expected**: Appropriate error message, no duplicate orders

### Scenario 4: Edge Cases

#### Test 1: Empty Cart
1. Clear cart completely
2. Try to access `/checkout` directly
3. **Expected**: Redirect to home page

#### Test 2: Large Order Value
1. Add high-value items (>₹10,000)
2. Test checkout flow
3. **Expected**: Free shipping applied if configured

#### Test 3: Single Item Order
1. Add only one item to cart
2. Complete checkout
3. **Expected**: Works normally

## 📊 Verification Checklist

### Frontend Verification
- [ ] Cart displays correct items and prices
- [ ] Checkout page loads without errors
- [ ] Shipping address form validation works
- [ ] Shipping options load based on pincode
- [ ] Order summary updates correctly
- [ ] Razorpay modal opens and functions
- [ ] Error messages are user-friendly
- [ ] Loading states work properly

### Backend Verification
- [ ] Shipping rates API returns real data
- [ ] Razorpay order creation works
- [ ] Payment verification succeeds
- [ ] WooCommerce order is created
- [ ] Order has correct details
- [ ] Payment status is "Paid"
- [ ] Customer receives confirmation

### Integration Verification
- [ ] No mock data is returned
- [ ] All API calls use real endpoints
- [ ] Error handling works for all scenarios
- [ ] Payment flow is secure
- [ ] Order data is accurate

## 🐛 Common Issues & Solutions

### Issue 1: "Payment gateway not configured"
**Cause**: Missing or incorrect Razorpay credentials
**Solution**: 
1. Check `.env.local` has correct `RAZORPAY_KEY_SECRET`
2. Verify key format starts with correct prefix
3. Restart development server

### Issue 2: "No shipping options available"
**Cause**: WooCommerce shipping zones not configured
**Solution**:
1. Go to WooCommerce > Settings > Shipping
2. Create shipping zones for India
3. Add shipping methods to zones

### Issue 3: "Failed to create order"
**Cause**: WooCommerce API credentials or connectivity issue
**Solution**:
1. Verify `WOOCOMMERCE_CONSUMER_KEY` and `WOOCOMMERCE_CONSUMER_SECRET`
2. Check WordPress site is accessible
3. Verify WooCommerce REST API is enabled

### Issue 4: Payment successful but no order
**Cause**: Payment verification or order creation failure
**Solution**:
1. Check browser console for errors
2. Verify Razorpay signature verification
3. Check WooCommerce API connectivity

## 📈 Performance Testing

### Load Testing
1. Test with multiple concurrent users
2. Verify payment processing under load
3. Check order creation performance

### Mobile Testing
1. Test checkout flow on mobile devices
2. Verify Razorpay modal works on mobile
3. Check responsive design

## 🔍 Debugging Tools

### Browser Console
Enable detailed logging:
```javascript
localStorage.setItem('debug', 'true');
```

### Network Tab
Monitor API calls:
1. Open Developer Tools > Network
2. Filter by XHR/Fetch
3. Check API response status and data

### Razorpay Dashboard
1. Monitor test payments in real-time
2. Check payment status and details
3. Verify webhook deliveries

### WooCommerce Logs
1. Go to WooCommerce > Status > Logs
2. Check for API errors
3. Monitor order creation logs

## ✅ Success Criteria

The integration is successful when:
1. **All test scenarios pass** without errors
2. **Real data flows** through all APIs
3. **Orders are created** in WooCommerce
4. **Payments are processed** via Razorpay
5. **Error handling works** for all edge cases
6. **Performance is acceptable** under normal load

## 🚀 Production Readiness

Before going live:
1. **Switch to live Razorpay keys**
2. **Test with real payment methods**
3. **Verify SSL certificate**
4. **Set up monitoring and alerts**
5. **Train support team on troubleshooting**

## 📞 Support Contacts

- **Razorpay Support**: support@razorpay.com
- **WooCommerce Support**: Check WordPress.org forums
- **Technical Issues**: Check browser console and API logs first
