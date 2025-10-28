import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Razorpay Webhook Handler - Enhanced Version
 *
 * This endpoint handles asynchronous payment notifications from Razorpay.
 * It ensures orders are created even if the user closes their browser
 * during the payment process.
 *
 * Webhook Events:
 * - payment.authorized: Payment authorized by bank
 * - payment.captured: Payment successfully captured (AUTO-CREATES ORDER)
 * - payment.failed: Payment failed
 * - order.paid: Order fully paid
 *
 * Security:
 * - Verifies webhook signature using HMAC-SHA256
 * - Processes only valid, authenticated webhooks
 * - Idempotent processing to prevent duplicate handling
 */

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const webhookSignature = request.headers.get('x-razorpay-signature');

    if (!webhookSignature) {
      console.error('❌ Webhook signature missing');
      return NextResponse.json(
        { error: 'Webhook signature required' },
        { status: 400 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ Razorpay webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const webhookEvent = JSON.parse(rawBody);

    console.log('✅ Razorpay webhook received:', {
      event: webhookEvent.event,
      payment_id: webhookEvent.payload?.payment?.entity?.id,
      order_id: webhookEvent.payload?.payment?.entity?.order_id,
      timestamp: new Date().toISOString()
    });

    // Handle different webhook events
    switch (webhookEvent.event) {
      case 'payment.authorized':
        await handlePaymentAuthorized(webhookEvent.payload.payment.entity);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(webhookEvent.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(webhookEvent.payload.payment.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(webhookEvent.payload.order.entity);
        break;

      default:
        console.log('ℹ️ Unhandled webhook event:', webhookEvent.event);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({
      received: true,
      event: webhookEvent.event,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);

    // Return 200 even on error to prevent Razorpay retries
    // Log the error for manual investigation
    return NextResponse.json({
      received: true,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle payment.authorized event
 * Payment has been authorized by the bank
 */
async function handlePaymentAuthorized(payment: any) {
  console.log('🔐 Payment authorized:', payment.id);

  // Log for tracking
  console.log('Payment details:', {
    payment_id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount / 100,
    method: payment.method,
    email: payment.email
  });
}

/**
 * Handle payment.captured event
 * Payment has been successfully captured
 * This is the primary success event - AUTO-CREATE ORDER HERE
 */
async function handlePaymentCaptured(payment: any) {
  console.log('💰 Payment captured:', payment.id);

  try {
    // Check if order already exists in WooCommerce
    const existingOrder = await checkIfOrderExists(payment.id);

    if (existingOrder) {
      console.log('✅ Order already exists for payment:', payment.id);
      return;
    }

    console.log('🔍 No existing order found, fetching Razorpay order details...');

    // Fetch full Razorpay order details to get notes
    const razorpayOrder = await fetchRazorpayOrder(payment.order_id);

    if (!razorpayOrder || !razorpayOrder.notes) {
      console.log('⚠️ No order notes found in Razorpay order');
      await logFailedWebhookProcessing(payment, new Error('No order data in Razorpay notes'));
      return;
    }

    // Check if notes contain order data
    const orderData = razorpayOrder.notes.order_data;

    if (!orderData) {
      console.log('⚠️ No order_data in Razorpay notes');
      await logFailedWebhookProcessing(payment, new Error('No order_data in notes'));
      return;
    }

    // Parse order data from notes
    let parsedOrderData;
    try {
      parsedOrderData = typeof orderData === 'string' ? JSON.parse(orderData) : orderData;
    } catch (parseError) {
      console.error('❌ Failed to parse order data from notes:', parseError);
      await logFailedWebhookProcessing(payment, parseError);
      return;
    }

    console.log('📦 Creating WooCommerce order from webhook...');

    // Create WooCommerce order
    const wooOrderId = await createWooCommerceOrder({
      ...parsedOrderData,
      paymentDetails: {
        payment_id: payment.id,
        order_id: payment.order_id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount / 100
      }
    });

    console.log('✅ WooCommerce order created successfully from webhook:', wooOrderId);

  } catch (error: any) {
    console.error('❌ Error handling captured payment:', error);
    await logFailedWebhookProcessing(payment, error);
  }
}

/**
 * Handle payment.failed event
 * Payment has failed
 */
async function handlePaymentFailed(payment: any) {
  console.log('❌ Payment failed:', {
    payment_id: payment.id,
    order_id: payment.order_id,
    error_code: payment.error_code,
    error_description: payment.error_description,
    method: payment.method
  });
}

/**
 * Handle order.paid event
 * Order has been fully paid (all payments captured)
 */
async function handleOrderPaid(order: any) {
  console.log('✅ Order paid:', order.id);
}

/**
 * Fetch Razorpay order details including notes
 */
async function fetchRazorpayOrder(orderId: string) {
  try {
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const order = await razorpay.orders.fetch(orderId);
    return order;

  } catch (error) {
    console.error('Error fetching Razorpay order:', error);
    return null;
  }
}

/**
 * Check if WooCommerce order already exists for this payment
 */
async function checkIfOrderExists(paymentId: string): Promise<boolean> {
  try {
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return false;
    }

    // Search for order with this payment ID in meta data
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders?meta_key=razorpay_payment_id&meta_value=${paymentId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );

    if (!response.ok) {
      return false;
    }

    const orders = await response.json();
    return orders.length > 0;

  } catch (error) {
    console.error('Error checking order existence:', error);
    return false;
  }
}

/**
 * Create WooCommerce order from webhook data
 */
async function createWooCommerceOrder(orderData: any): Promise<string> {
  try {
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      throw new Error('WooCommerce credentials not configured');
    }

    // Prepare order payload
    const orderPayload: any = {
      billing: {
        first_name: orderData.address.firstName,
        last_name: orderData.address.lastName,
        email: orderData.address.email,
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

        // Add variation_id if present and valid
        if (item.variationId) {
          const variationIdInt = parseInt(item.variationId);
          if (!isNaN(variationIdInt) && variationIdInt > 0) {
            lineItem.variation_id = variationIdInt;
          }
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
      status: 'processing'
    };

    // Add customer ID if available
    if (orderData.customerId) {
      orderPayload.customer_id = orderData.customerId;
    }

    // Add metadata
    orderPayload.meta_data = [
      {
        key: 'razorpay_payment_id',
        value: orderData.paymentDetails.payment_id
      },
      {
        key: 'razorpay_order_id',
        value: orderData.paymentDetails.order_id
      },
      {
        key: 'payment_gateway',
        value: 'razorpay_headless'
      },
      {
        key: 'created_via_webhook',
        value: 'true'
      },
      {
        key: 'webhook_timestamp',
        value: new Date().toISOString()
      }
    ];

    console.log('📝 Creating WooCommerce order via webhook');

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
      console.error('WooCommerce API error:', JSON.stringify(errorData, null, 2));
      throw new Error(`WooCommerce API error: ${errorData.message || response.statusText}`);
    }

    const order = await response.json();
    console.log('✅ WooCommerce order created via webhook:', order.id);

    // Send order confirmation email via Resend (backup to WooCommerce emails)
    try {
      const { sendOrderConfirmationEmail: sendEmail } = await import('@/lib/send-email');

      const subtotal = orderData.cartItems.reduce(
        (sum: number, item: any) => sum + (item.price * item.quantity),
        0
      );
      const total = subtotal + orderData.shipping.cost;

      await sendEmail({
        to: orderData.address.email,
        customerName: `${orderData.address.firstName} ${orderData.address.lastName}`,
        orderNumber: order.id.toString(),
        orderData: {
          cartItems: orderData.cartItems,
          shipping: orderData.shipping,
          total,
          address: orderData.address,
          paymentMethod: paymentDetails.method === 'card' || paymentDetails.method === 'upi' ? 'online' : 'cod'
        }
      });

      console.log('✅ Order confirmation email sent via Resend from webhook for order:', order.id);
    } catch (emailError) {
      console.error('❌ Error sending email from webhook (non-critical):', emailError);
      // Don't fail webhook processing if email fails
    }

    return order.id.toString();

  } catch (error: any) {
    console.error('Error creating WooCommerce order from webhook:', error);
    throw error;
  }
}

/**
 * Log failed webhook processing for manual reconciliation
 */
async function logFailedWebhookProcessing(payment: any, error: any) {
  console.error('⚠️ MANUAL RECONCILIATION REQUIRED:', {
    payment_id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount / 100,
    method: payment.method,
    email: payment.email,
    error: error.message,
    timestamp: new Date().toISOString()
  });

  // In production, you should:
  // 1. Store this in a database table for failed webhooks
  // 2. Send alert to admin/support team via email/Slack
  // 3. Create a manual reconciliation dashboard

  // TODO: Implement database logging and alerts
  /*
  await db.failedWebhooks.create({
    payment_id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount / 100,
    error_message: error.message,
    payload: JSON.stringify(payment),
    status: 'pending_reconciliation',
    created_at: new Date()
  });

  // Send alert email/Slack notification
  await sendAlert({
    type: 'webhook_failure',
    payment_id: payment.id,
    amount: payment.amount / 100,
    error: error.message
  });
  */
}
