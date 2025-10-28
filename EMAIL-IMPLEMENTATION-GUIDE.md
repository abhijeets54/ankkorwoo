# 📧 Order Confirmation Email Implementation Guide

## Overview

You need to send order confirmation emails to customers after successful payment. There are **3 main approaches**, ranked by ease of implementation.

---

## ✅ Option 1: WooCommerce Native Emails (EASIEST - Recommended)

**Pros**:
- ✅ Already built into WooCommerce
- ✅ Professional templates
- ✅ Automatic order details
- ✅ No code changes needed
- ✅ No external services required

**Cons**:
- ⚠️ Requires WooCommerce email configuration
- ⚠️ May need SMTP plugin for reliability

### Setup Steps

#### 1. Configure WooCommerce Email Settings

**In WordPress Admin**:
1. Go to **WooCommerce → Settings → Emails**
2. Enable these email templates:
   - ✅ **"New Order"** (Admin notification)
   - ✅ **"Processing Order"** (Customer notification) ← THIS ONE
   - ✅ **"Completed Order"** (Customer notification)

3. Click **"Processing Order"** to configure:
   - Enable: ✅ Yes
   - Subject: `Your order has been received - Order #{order_number}`
   - Email Heading: `Thank you for your order`
   - Additional Content: (Optional custom message)

#### 2. Verify Email Trigger

WooCommerce automatically sends "Processing Order" emails when:
- Order status is set to `processing`
- `set_paid: true` is set

Your code already does this! ✅

```typescript
// In createWooCommerceOrder
const orderPayload = {
  // ... other fields
  status: 'processing',  // ✅ Triggers email
  set_paid: true,        // ✅ Marks as paid
};
```

#### 3. Test WooCommerce Emails

**Test from WordPress**:
1. Go to **WooCommerce → Settings → Emails**
2. Hover over **"Processing Order"**
3. Click **"Send Test Email"**
4. Check if email arrives

**If emails don't arrive**, proceed to Step 4.

#### 4. Install SMTP Plugin (If Needed)

WordPress default email (`wp_mail()`) often fails. Use SMTP instead.

**Recommended Plugins**:
- **WP Mail SMTP** (Free) - Most popular
- **Post SMTP** (Free)
- **Easy WP SMTP** (Free)

**WP Mail SMTP Setup**:
1. Install plugin from WordPress admin
2. Go to **WP Mail SMTP → Settings**
3. Choose mailer:
   - **Gmail** (for testing)
   - **SendGrid** (recommended for production)
   - **Mailgun** (alternative)
   - **Amazon SES** (advanced)

4. For Gmail (Quick Test):
   - From Email: `your-email@gmail.com`
   - From Name: `Ankkor`
   - Mailer: `Gmail`
   - Enable "Allow less secure apps" in Google Account

5. For SendGrid (Production):
   - Sign up at sendgrid.com
   - Get API key
   - From Email: `orders@ankkor.in`
   - From Name: `Ankkor`
   - Mailer: `SendGrid`
   - API Key: (paste your key)

6. **Send Test Email** from plugin settings

#### 5. Add Billing Email to Orders

Make sure your order payload includes customer email:

```typescript
// In createWooCommerceOrder function
const orderPayload = {
  billing: {
    first_name: orderData.address.firstName,
    last_name: orderData.address.lastName,
    email: orderData.address.email, // ← ADD THIS if missing
    phone: orderData.address.phone,
    // ... rest of fields
  },
  // ...
};
```

**Check your checkout form** has an email field and passes it to the order creation.

---

## 🚀 Option 2: Custom Emails via Resend (Modern - Recommended)

**Pros**:
- ✅ Easy integration
- ✅ Beautiful templates with React
- ✅ Free tier: 3,000 emails/month
- ✅ Great deliverability
- ✅ Full control over design

**Cons**:
- ⚠️ Requires code changes
- ⚠️ External dependency

### Implementation Steps

#### 1. Install Resend Package

```bash
npm install resend
npm install @react-email/components
```

#### 2. Create Email Template

Create `src/emails/OrderConfirmation.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';

interface OrderConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  orderTotal: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  shippingAddress: {
    address1: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export default function OrderConfirmationEmail({
  orderNumber,
  customerName,
  orderTotal,
  items,
  shippingAddress,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Order #{orderNumber} confirmed - Thank you for shopping with Ankkor</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thank you for your order!</Heading>

          <Text style={text}>
            Hi {customerName},
          </Text>

          <Text style={text}>
            Your order has been confirmed and will be shipped soon.
          </Text>

          <Section style={orderInfo}>
            <Row>
              <Column>
                <Text style={orderLabel}>Order Number:</Text>
                <Text style={orderValue}>#{orderNumber}</Text>
              </Column>
              <Column>
                <Text style={orderLabel}>Order Total:</Text>
                <Text style={orderValue}>₹{orderTotal}</Text>
              </Column>
            </Row>
          </Section>

          <Heading style={h2}>Order Items</Heading>
          {items.map((item, index) => (
            <Section key={index} style={itemSection}>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemDetails}>
                Quantity: {item.quantity} × ₹{item.price}
              </Text>
            </Section>
          ))}

          <Heading style={h2}>Shipping Address</Heading>
          <Text style={address}>
            {shippingAddress.address1}<br />
            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.pincode}
          </Text>

          <Text style={footer}>
            Need help? Reply to this email or contact us at support@ankkor.in
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '30px 0 15px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const orderInfo = {
  backgroundColor: '#f4f4f4',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const orderLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 4px',
};

const orderValue = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const itemSection = {
  borderBottom: '1px solid #eee',
  padding: '12px 0',
};

const itemName = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
};

const itemDetails = {
  color: '#666',
  fontSize: '14px',
  margin: '4px 0 0',
};

const address = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '40px',
  textAlign: 'center' as const,
};
```

#### 3. Update sendOrderConfirmationEmail Function

Replace the placeholder in `src/app/api/razorpay/verify-payment/route.ts`:

```typescript
import { Resend } from 'resend';
import OrderConfirmationEmail from '@/emails/OrderConfirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOrderConfirmationEmail(order: any, orderData: any): Promise<void> {
  try {
    console.log(`Sending order confirmation email for order ${order.id}`);

    // Prepare email data
    const emailData = {
      orderNumber: order.number || order.id,
      customerName: `${orderData.address.firstName} ${orderData.address.lastName}`,
      orderTotal: (order.total || calculateTotal(orderData)).toFixed(2),
      items: orderData.cartItems.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: (typeof item.price === 'string' ? parseFloat(item.price) : item.price).toFixed(2),
      })),
      shippingAddress: {
        address1: orderData.address.address1,
        city: orderData.address.city,
        state: orderData.address.state,
        pincode: orderData.address.pincode,
      },
    };

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Ankkor Orders <orders@ankkor.in>',
      to: [orderData.address.email],
      subject: `Order Confirmed - #${emailData.orderNumber}`,
      react: OrderConfirmationEmail(emailData),
    });

    if (error) {
      console.error('Resend email error:', error);
      return;
    }

    console.log('✅ Order confirmation email sent:', data?.id);

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw - email failure shouldn't fail order creation
  }
}

function calculateTotal(orderData: any): number {
  const subtotal = orderData.cartItems.reduce((sum: number, item: any) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return sum + (price * item.quantity);
  }, 0);
  return subtotal + (orderData.shipping?.cost || 0);
}
```

#### 4. Add Environment Variable

Add to `.env.local` and Vercel:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

Get your API key from: https://resend.com/api-keys

#### 5. Verify Domain (Production)

For production, verify your domain in Resend:
1. Go to Resend Dashboard → Domains
2. Add domain: `ankkor.in`
3. Add DNS records they provide
4. Wait for verification
5. Use `orders@ankkor.in` as sender

---

## 📮 Option 3: Nodemailer with SMTP (Traditional)

**Pros**:
- ✅ Works with any SMTP provider
- ✅ No external API dependencies

**Cons**:
- ⚠️ More complex setup
- ⚠️ Requires SMTP credentials
- ⚠️ Manual HTML template creation

### Quick Implementation

#### 1. Install Nodemailer

```bash
npm install nodemailer
npm install @types/nodemailer --save-dev
```

#### 2. Update sendOrderConfirmationEmail

```typescript
import nodemailer from 'nodemailer';

async function sendOrderConfirmationEmail(order: any, orderData: any): Promise<void> {
  try {
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Prepare order items HTML
    const itemsHtml = orderData.cartItems
      .map((item: any) => {
        const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${price.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const total = orderData.cartItems.reduce((sum: number, item: any) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return sum + (price * item.quantity);
    }, 0) + (orderData.shipping?.cost || 0);

    // Email HTML template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c2c27; text-align: center;">Thank you for your order!</h1>

          <p>Hi ${orderData.address.firstName},</p>

          <p>Your order has been confirmed and will be shipped soon.</p>

          <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> #${order.number || order.id}</p>
            <p><strong>Order Total:</strong> ₹${total.toFixed(2)}</p>
          </div>

          <h3>Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f4f4f4;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Quantity</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <h3>Shipping Address</h3>
          <p>
            ${orderData.address.address1}<br>
            ${orderData.address.address2 ? orderData.address.address2 + '<br>' : ''}
            ${orderData.address.city}, ${orderData.address.state} ${orderData.address.pincode}
          </p>

          <p style="margin-top: 30px; color: #666; font-size: 14px; text-align: center;">
            Need help? Contact us at <a href="mailto:support@ankkor.in">support@ankkor.in</a>
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"Ankkor" <${process.env.SMTP_USER}>`,
      to: orderData.address.email,
      subject: `Order Confirmed - #${order.number || order.id}`,
      html: html,
    });

    console.log('✅ Email sent:', info.messageId);

  } catch (error) {
    console.error('Error sending email:', error);
  }
}
```

#### 3. Add Environment Variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**For Gmail**:
- Enable 2FA on your Google account
- Generate App Password: https://myaccount.google.com/apppasswords
- Use App Password as `SMTP_PASS`

---

## 🎯 Recommendation

### For Quick Setup (Now):
→ **Option 1: WooCommerce Native Emails**
- Zero code changes
- Just configure WooCommerce + SMTP plugin
- Ready in 10 minutes

### For Production (Soon):
→ **Option 2: Resend with React Email**
- Beautiful branded emails
- Full control
- Better deliverability
- Modern solution

---

## ✅ Testing Checklist

After implementing emails:

1. **Test Order Creation**:
   - [ ] Place test order
   - [ ] Check if email arrives
   - [ ] Verify all details are correct
   - [ ] Check spam folder if not in inbox

2. **Test Different Scenarios**:
   - [ ] Online payment
   - [ ] COD payment
   - [ ] Webhook-created order
   - [ ] Multiple items in cart

3. **Check Email Content**:
   - [ ] Order number is correct
   - [ ] Items list is complete
   - [ ] Prices are correct
   - [ ] Shipping address is correct
   - [ ] Total amount matches

4. **Production Checks**:
   - [ ] Sender email is branded (`orders@ankkor.in`)
   - [ ] Email doesn't go to spam
   - [ ] Mobile responsive design
   - [ ] All links work

---

## 🚨 Common Issues & Fixes

### Issue 1: Emails Go to Spam
**Solution**:
- Use authenticated domain (`orders@ankkor.in`, not Gmail)
- Add SPF/DKIM records
- Use reputable SMTP provider (SendGrid, Resend)

### Issue 2: No Email Received
**Solution**:
- Check `orderData.address.email` has customer email
- Verify SMTP credentials
- Check server logs for errors
- Test SMTP connection separately

### Issue 3: Email Missing Customer Email
**Solution**:
Add email field to checkout form if missing:

```tsx
// In checkout form
<div>
  <Label htmlFor="email">Email Address *</Label>
  <Input
    id="email"
    type="email"
    {...register('email', {
      required: 'Email is required',
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: 'Invalid email address',
      },
    })}
  />
</div>
```

---

## 📚 Next Steps

1. Choose your approach (recommend Option 1 for quick start)
2. Follow implementation steps
3. Test with test orders
4. Monitor email delivery
5. Consider upgrading to Option 2 later for branding

Need help with any specific approach? Let me know!
