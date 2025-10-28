# ✅ WooCommerce Email Setup - Step by Step Guide

## Overview
This guide will help you enable order confirmation emails using WooCommerce's built-in email system. **No code changes needed!**

---

## 🎯 Step 1: Add Email Field to Checkout Form (Required First!)

**Important**: We need to collect customer email addresses first.

### Update Checkout Form Interface

**File**: `src/app/checkout/page.tsx`

**Line 19-28**: Update the `CheckoutFormData` interface:

```typescript
interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;  // ← ADD THIS LINE
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}
```

### Add Email Input Field to Form

Find the checkout form (around line 600-700 where other input fields are).

Add this field after the name fields:

```tsx
{/* Email Field */}
<div className="space-y-2">
  <Label htmlFor="email">
    Email Address <span className="text-red-500">*</span>
  </Label>
  <Input
    id="email"
    type="email"
    placeholder="your.email@example.com"
    {...register('email', {
      required: 'Email address is required',
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: 'Please enter a valid email address'
      }
    })}
    disabled={isSubmitting}
  />
  {errors.email && (
    <p className="text-sm text-red-500">{errors.email.message}</p>
  )}
</div>
```

### Update Button Disabled Condition

Find the Pay button's disabled condition (around line 800) and add email check:

```typescript
disabled={
  isSubmitting ||
  !firstName ||
  !lastName ||
  !email ||  // ← ADD THIS LINE
  !address1 ||
  !city ||
  !state ||
  !pincode ||
  !phone ||
  !checkoutStore.selectedShipping ||
  checkoutStore.isProcessingPayment ||
  Object.keys(errors).length > 0
}
```

### Watch Email Field

Add email to the watched fields (around line 120):

```typescript
const firstName = watch('firstName');
const lastName = watch('lastName');
const email = watch('email');  // ← ADD THIS LINE
const address1 = watch('address1');
// ... rest of fields
```

### Update ShippingAddress Interface

**File**: `src/lib/checkoutStore.ts` (around line 8)

```typescript
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;  // ← ADD THIS LINE
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}
```

### Include Email in Address Save

In `handlePayment` function (around line 240), make sure email is saved:

```typescript
checkoutStore.setShippingAddress({
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,  // ← ADD THIS LINE
  address1: formData.address1,
  address2: formData.address2,
  city: formData.city,
  state: formData.state,
  pincode: formData.pincode,
  phone: formData.phone,
});
```

---

## 🎯 Step 2: Update Order Creation to Include Email

### For Online Payment (verify-payment/route.ts)

**File**: `src/app/api/razorpay/verify-payment/route.ts`

Find the `billing` object creation (around line 206) and ensure email is included:

```typescript
billing: {
  first_name: orderData.address.firstName,
  last_name: orderData.address.lastName,
  email: orderData.address.email,  // ← VERIFY THIS LINE EXISTS
  address_1: orderData.address.address1,
  address_2: orderData.address.address2 || '',
  city: orderData.address.city,
  state: orderData.address.state,
  postcode: orderData.address.pincode,
  country: 'IN',
  phone: orderData.address.phone
},
```

### For COD Payment (cod-prepayment/route.ts)

**File**: `src/app/api/razorpay/cod-prepayment/route.ts`

Same as above - ensure billing includes email.

### For Webhook (webhooks/razorpay/route.ts)

**File**: `src/app/api/webhooks/razorpay/route.ts`

Same as above - ensure billing includes email (around line 304).

---

## 🎯 Step 3: Configure WooCommerce Email Settings

Now go to your WordPress admin panel:

### Enable Order Emails

1. **Login to WordPress Admin**
   - URL: `https://maroon-lapwing-781450.hostingersite.com/wp-admin`

2. **Go to WooCommerce Settings**
   - Navigate to: **WooCommerce → Settings → Emails**

3. **Enable "Processing Order" Email** (Customer Notification)
   - Click on **"Processing Order"**
   - Settings:
     - ✅ **Enable**: Check this box
     - **Subject**: `Your order has been received - Order #{order_number}`
     - **Email Heading**: `Thank you for your order!`
     - **Additional Content** (optional):
       ```
       We're preparing your order for shipment. You'll receive a shipping confirmation email when your order is on its way.

       If you have any questions, please contact us at support@ankkor.in
       ```
   - Click **Save Changes**

4. **Enable "Completed Order" Email** (Optional)
   - Click on **"Completed Order"**
   - ✅ **Enable**: Check this box
   - Subject: `Your order is complete - Order #{order_number}`
   - Click **Save Changes**

5. **Configure Email Sender**
   - Still in **WooCommerce → Settings → Emails**
   - Scroll to bottom:
     - **"From" Name**: `Ankkor`
     - **"From" Email Address**: `orders@ankkor.in` (or your domain email)
   - Click **Save Changes**

---

## 🎯 Step 4: Install WP Mail SMTP Plugin

WordPress default email often fails. Use SMTP for reliable delivery.

### Install Plugin

1. **Go to Plugins**
   - Navigate to: **Plugins → Add New**

2. **Search for "WP Mail SMTP"**
   - By WPForms
   - Click **Install Now**
   - Click **Activate**

### Configure with Gmail (Quick Test)

1. **Go to WP Mail SMTP Settings**
   - Navigate to: **WP Mail SMTP → Settings**

2. **From Email**
   - From Email: `your-gmail@gmail.com`
   - From Name: `Ankkor`

3. **Choose Mailer: Gmail**
   - Select **Google / Gmail**

4. **Set Up Gmail OAuth** (Click "Set Up Gmail / Google Workspace")
   - You'll need to create a Google Cloud Project
   - Follow the wizard in the plugin
   - OR use "Other SMTP" option below for simpler setup

### Alternative: Use "Other SMTP" with Gmail

Simpler option for testing:

1. **Choose Mailer: Other SMTP**

2. **SMTP Settings**:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **Encryption**: `TLS`
   - **Auto TLS**: `Yes`

3. **SMTP Authentication**:
   - **Username**: Your Gmail address
   - **Password**: Use Gmail App Password (not your regular password)
     - Go to: https://myaccount.google.com/apppasswords
     - Enable 2FA first if not enabled
     - Generate App Password
     - Use that password here

4. **Save Settings**

5. **Send Test Email**
   - Use the test email feature in the plugin
   - Enter your email
   - Click **Send Email**
   - Check if you receive it

---

## 🎯 Step 5: Production SMTP (SendGrid - Recommended)

For production, use SendGrid instead of Gmail for better deliverability.

### SignUp for SendGrid

1. Go to: https://sendgrid.com
2. Sign up for free account (100 emails/day free)
3. Verify your email
4. Complete sender verification

### Get SendGrid API Key

1. Go to **Settings → API Keys**
2. Click **Create API Key**
3. Name: `WP Mail SMTP - Ankkor`
4. Permissions: **Full Access**
5. **Copy the API key** (you won't see it again!)

### Configure WP Mail SMTP with SendGrid

1. **Go to WP Mail SMTP → Settings**

2. **Choose Mailer: SendGrid**

3. **SendGrid Settings**:
   - **API Key**: Paste your SendGrid API key
   - **From Email**: `orders@ankkor.in`
   - **From Name**: `Ankkor`

4. **Save Settings**

5. **Send Test Email**

### Verify Domain (Production)

For production using your domain (`orders@ankkor.in`):

1. **In SendGrid Dashboard**:
   - Go to **Settings → Sender Authentication**
   - Click **Authenticate Your Domain**
   - Enter domain: `ankkor.in`
   - Follow DNS setup instructions

2. **Add DNS Records**:
   - SendGrid will provide CNAME records
   - Add them to your domain's DNS settings (at Vercel or domain registrar)
   - Wait for verification (can take up to 48 hours)

3. **Once Verified**:
   - Use `orders@ankkor.in` as From Email in WP Mail SMTP

---

## 🎯 Step 6: Test Complete Flow

### Test Order with Email

1. **Place a Test Order**:
   - Go to your site
   - Add product to cart
   - Go to checkout
   - Fill in all details **including email**
   - Complete payment (use test card: `4111 1111 1111 1111`)

2. **Check Email Arrival**:
   - Check the email inbox you provided
   - Look in spam folder if not in inbox
   - Email should arrive within 1-2 minutes

3. **Verify Email Content**:
   - ✅ Order number is correct
   - ✅ Order total matches
   - ✅ Items are listed
   - ✅ Shipping address is correct

### Check WooCommerce Order

1. **Go to WordPress Admin**
   - Navigate to: **WooCommerce → Orders**

2. **Click the Test Order**
   - Verify billing email is populated
   - Check order status is "Processing"

3. **Check Email Log** (if WP Mail SMTP has logging enabled)
   - See if email was sent successfully

---

## ✅ Verification Checklist

Before going to production:

### Code Changes
- [ ] Added `email` field to `CheckoutFormData` interface
- [ ] Added email input field to checkout form
- [ ] Added email validation
- [ ] Updated button disabled condition to check email
- [ ] Added email to `ShippingAddress` interface
- [ ] Email is saved in `setShippingAddress`
- [ ] Email is included in Razorpay order notes `order_data`
- [ ] Email is included in WooCommerce order `billing.email`

### WooCommerce Configuration
- [ ] "Processing Order" email enabled
- [ ] Email sender configured (From Name & Email)
- [ ] WP Mail SMTP plugin installed and activated
- [ ] SMTP configured (Gmail for test, SendGrid for production)
- [ ] Test email sent successfully

### Testing
- [ ] Test order placed with email address
- [ ] Email received in inbox (or spam)
- [ ] Email content is correct
- [ ] Order appears in WooCommerce with email
- [ ] Works for both online and COD payments
- [ ] Webhook-created orders also send emails

---

## 🚨 Troubleshooting

### Issue 1: No Email Received

**Check**:
1. Spam/junk folder
2. WP Mail SMTP test email works
3. WooCommerce order has customer email in billing
4. "Processing Order" email is enabled
5. SMTP credentials are correct

**Solution**:
- Enable logging in WP Mail SMTP
- Check email log for errors
- Try sending test email from WP Mail SMTP
- Verify SMTP host/port/credentials

### Issue 2: Email Goes to Spam

**Solution**:
- Use authenticated domain (`orders@ankkor.in`)
- Complete SendGrid domain verification
- Add SPF/DKIM records
- Don't use Gmail for production

### Issue 3: Email Field Not Showing on Checkout

**Check**:
- Email field was added to form
- No TypeScript errors in console
- Form is re-rendered after code changes
- Browser cache cleared

### Issue 4: Order Created But No Email

**Check**:
- Email is in WooCommerce order billing details
- "Processing Order" email is enabled
- WP Mail SMTP is configured
- Check WooCommerce email logs

---

## 📊 Success Metrics

After implementation, you should see:

✅ **100% of orders have customer email**
✅ **Email delivery rate > 95%**
✅ **Emails arrive within 1-2 minutes**
✅ **< 5% emails in spam** (with proper domain verification)

---

## 🚀 Next Steps After Basic Setup

### Phase 1 (Now): Basic Emails Working
- ✅ WooCommerce native emails
- ✅ SMTP delivery
- ✅ Customer receives confirmation

### Phase 2 (Later): Branded Emails
- Custom email templates
- Branded design
- Company logo
- Custom footer

### Phase 3 (Advanced): Email Marketing
- Abandoned cart emails
- Review request emails
- Promotional emails
- Order status updates

---

## 📞 Need Help?

If you encounter issues:

1. Check WooCommerce email logs
2. Check WP Mail SMTP logs
3. Test SMTP connection separately
4. Verify environment variables
5. Check server error logs

---

## ✅ Summary

1. **Add email field to checkout form** ← Start here
2. **Update order creation to include email**
3. **Enable WooCommerce "Processing Order" email**
4. **Install & configure WP Mail SMTP**
5. **Test with real order**
6. **Monitor email delivery**

**Estimated Time**: 30-45 minutes

**Ready to start? Begin with Step 1!** 🚀
