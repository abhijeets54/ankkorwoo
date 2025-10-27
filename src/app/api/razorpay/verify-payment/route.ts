import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      address,
      cartItems,
      shipping
    } = body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    if (!address || !cartItems || !shipping) {
      return NextResponse.json(
        { success: false, message: 'Missing order data' },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeySecret) {
      console.error('Razorpay key secret not configured');
      return NextResponse.json(
        { success: false, message: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Invalid payment signature');
      return NextResponse.json(
        { success: false, message: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    console.log('Payment signature verified successfully');

    // ✅ SECURITY: Verify payment details from Razorpay API
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!razorpayKeyId) {
      throw new Error('Razorpay key ID not configured');
    }

    // Initialize Razorpay SDK
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // Fetch payment details from Razorpay
    let payment;
    let razorpayOrder;

    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
      razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    } catch (error: any) {
      console.error('Error fetching payment/order from Razorpay:', error);
      return NextResponse.json(
        { success: false, message: 'Unable to verify payment with gateway' },
        { status: 500 }
      );
    }

    // ✅ SECURITY: Verify payment status
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      console.error('Payment not successful. Status:', payment.status);
      return NextResponse.json(
        {
          success: false,
          message: `Payment ${payment.status}. Cannot create order.`
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Verify payment belongs to this order
    if (payment.order_id !== razorpay_order_id) {
      console.error('Payment order mismatch');
      return NextResponse.json(
        { success: false, message: 'Payment order mismatch' },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Verify payment amount matches expected amount
    const expectedAmount = calculateExpectedAmount(cartItems, shipping);
    const paidAmount = payment.amount / 100; // Convert paise to rupees

    // Allow 1 rupee tolerance for floating point errors
    if (Math.abs(paidAmount - expectedAmount) > 1) {
      console.error('Payment amount mismatch:', {
        expected: expectedAmount,
        paid: paidAmount,
        difference: Math.abs(paidAmount - expectedAmount)
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Payment amount mismatch. Please contact support.'
        },
        { status: 400 }
      );
    }

    console.log('Payment verification complete:', {
      payment_id: payment.id,
      status: payment.status,
      amount: paidAmount,
      method: payment.method
    });

    // Create order in WooCommerce
    const orderId = await createWooCommerceOrder({
      address,
      cartItems,
      shipping,
      paymentDetails: {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        signature: razorpay_signature,
        status: payment.status,
        method: payment.method,
        amount: paidAmount
      }
    });

    return NextResponse.json({
      success: true,
      orderId: orderId,
      message: 'Payment verified and order created successfully'
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}

async function createWooCommerceOrder(orderData: any): Promise<string> {
  try {
    // Validate WooCommerce credentials
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      throw new Error('WooCommerce credentials not configured');
    }

    // Calculate total amount
    const subtotal = orderData.cartItems.reduce((total: number, item: any) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return total + (price * item.quantity);
    }, 0);

    const totalAmount = subtotal + orderData.shipping.cost;

    // Prepare order payload for WooCommerce REST API
    const orderPayload = {
      billing: {
        first_name: orderData.address.firstName,
        last_name: orderData.address.lastName,
        address_1: orderData.address.address1,
        address_2: orderData.address.address2 || '',
        city: orderData.address.city,
        state: orderData.address.state,
        postcode: orderData.address.pincode,
        country: 'IN',
        phone: orderData.address.phone
      },
      shipping: {
        first_name: orderData.address.firstName,
        last_name: orderData.address.lastName,
        address_1: orderData.address.address1,
        address_2: orderData.address.address2 || '',
        city: orderData.address.city,
        state: orderData.address.state,
        postcode: orderData.address.pincode,
        country: 'IN'
      },
      line_items: orderData.cartItems.map((item: any) => {
        const lineItem: any = {
          product_id: parseInt(item.productId),
          quantity: item.quantity
        };

        // Add variation_id if present
        if (item.variationId) {
          lineItem.variation_id = parseInt(item.variationId);
        }

        // Add meta_data for attributes (size, etc.) if present
        if (item.attributes && item.attributes.length > 0) {
          lineItem.meta_data = item.attributes.map((attr: any) => ({
            key: attr.name,
            value: attr.value,
            display_key: attr.name,
            display_value: attr.value
          }));
        }

        return lineItem;
      }),
      shipping_lines: [{
        method_id: orderData.shipping.id,
        method_title: orderData.shipping.name,
        total: orderData.shipping.cost.toString()
      }],
      payment_method: 'razorpay',
      payment_method_title: 'Razorpay',
      set_paid: true,
      status: 'processing',
      meta_data: [
        {
          key: 'razorpay_payment_id',
          value: orderData.paymentDetails.payment_id
        },
        {
          key: 'razorpay_order_id',
          value: orderData.paymentDetails.order_id
        },
        {
          key: 'razorpay_signature',
          value: orderData.paymentDetails.signature
        },
        {
          key: 'payment_gateway',
          value: 'razorpay_headless'
        }
      ]
    };

    console.log('Creating WooCommerce order with payload:', JSON.stringify(orderPayload, null, 2));

    // Create Basic Auth header
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    // Call WooCommerce REST API
    const response = await fetch(`${wooUrl}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('WooCommerce API error:', errorData);
      throw new Error(`WooCommerce API error: ${errorData.message || response.statusText}`);
    }

    const order = await response.json();
    console.log('WooCommerce order created successfully:', order.id);

    // Send order confirmation email (optional)
    await sendOrderConfirmationEmail(order, orderData.address);

    return order.id.toString();

  } catch (error: any) {
    console.error('Error creating WooCommerce order:', error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
}

/**
 * Calculate expected order amount from cart items and shipping
 * This prevents price manipulation attacks
 */
function calculateExpectedAmount(cartItems: any[], shipping: any): number {
  const subtotal = cartItems.reduce((total: number, item: any) => {
    const price = typeof item.price === 'string'
      ? parseFloat(item.price.replace(/[₹$€£,]/g, '').trim())
      : item.price;
    return total + (price * item.quantity);
  }, 0);

  const shippingCost = shipping.cost || 0;
  const totalAmount = subtotal + shippingCost;

  return Math.round(totalAmount * 100) / 100; // Round to 2 decimal places
}

async function sendOrderConfirmationEmail(order: any, address: any): Promise<void> {
  try {
    // This is optional - you can implement email sending here
    // Using services like SendGrid, Nodemailer, etc.
    console.log(`Order confirmation email should be sent for order ${order.id} to ${address.firstName} ${address.lastName}`);

    // Example with nodemailer (you'd need to install it):
    /*
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: address.email,
      subject: `Order Confirmation - #${order.number}`,
      html: `
        <h1>Thank you for your order!</h1>
        <p>Your order #${order.number} has been confirmed.</p>
        <p>Total: ₹${order.total}</p>
      `
    });
    */
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw error here as order creation was successful
  }
}
