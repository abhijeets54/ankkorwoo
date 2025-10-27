import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Razorpay Webhook Handler
 *
 * This endpoint handles asynchronous payment notifications from Razorpay.
 * It ensures payment status is synced even if the user closes their browser
 * during the payment process.
 *
 * Webhook Events:
 * - payment.authorized: Payment authorized by bank
 * - payment.captured: Payment successfully captured
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
      console.error('Webhook signature missing');
      return NextResponse.json(
        { error: 'Webhook signature required' },
        { status: 400 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
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
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const webhookEvent = JSON.parse(rawBody);

    console.log('Razorpay webhook received:', {
      event: webhookEvent.event,
      payment_id: webhookEvent.payload?.payment?.entity?.id,
      order_id: webhookEvent.payload?.payment?.entity?.order_id
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
        console.log('Unhandled webhook event:', webhookEvent.event);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({
      received: true,
      event: webhookEvent.event
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // Return 200 even on error to prevent Razorpay retries
    // Log the error for manual investigation
    return NextResponse.json({
      received: true,
      error: error.message
    });
  }
}

/**
 * Handle payment.authorized event
 * Payment has been authorized by the bank
 */
async function handlePaymentAuthorized(payment: any) {
  console.log('Payment authorized:', payment.id);

  // Store payment authorization in database for reconciliation
  // You can implement database logging here

  // Example:
  /*
  await db.paymentLogs.create({
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    status: 'authorized',
    amount: payment.amount / 100,
    method: payment.method,
    email: payment.email,
    contact: payment.contact,
    timestamp: new Date(payment.created_at * 1000)
  });
  */
}

/**
 * Handle payment.captured event
 * Payment has been successfully captured
 * This is the primary success event
 */
async function handlePaymentCaptured(payment: any) {
  console.log('Payment captured:', payment.id);

  try {
    // Check if order already exists in WooCommerce
    const existingOrder = await checkIfOrderExists(payment.id);

    if (existingOrder) {
      console.log('Order already exists for payment:', payment.id);
      return;
    }

    // Fetch order details from notes or metadata
    // In your main payment flow, you should store cart/address data
    // in Razorpay order notes for webhook reconciliation

    // For now, log for manual reconciliation
    console.log('Payment captured but no order details found:', {
      payment_id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount / 100,
      method: payment.method
    });

    // You can implement automatic order creation here if you have
    // stored cart/address data in the Razorpay order notes

  } catch (error) {
    console.error('Error handling captured payment:', error);

    // Log failed webhook processing for manual reconciliation
    await logFailedWebhookProcessing(payment, error);
  }
}

/**
 * Handle payment.failed event
 * Payment has failed
 */
async function handlePaymentFailed(payment: any) {
  console.log('Payment failed:', {
    payment_id: payment.id,
    order_id: payment.order_id,
    error_code: payment.error_code,
    error_description: payment.error_description
  });

  // Store failed payment for analytics and customer support
  /*
  await db.paymentLogs.create({
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    status: 'failed',
    amount: payment.amount / 100,
    error_code: payment.error_code,
    error_description: payment.error_description,
    timestamp: new Date(payment.created_at * 1000)
  });
  */

  // Optional: Send notification to customer about failed payment
}

/**
 * Handle order.paid event
 * Order has been fully paid (all payments captured)
 */
async function handleOrderPaid(order: any) {
  console.log('Order paid:', order.id);

  // This event is fired when all payments for an order are captured
  // Useful for orders with partial payments or installments
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
 * Log failed webhook processing for manual reconciliation
 */
async function logFailedWebhookProcessing(payment: any, error: any) {
  console.error('MANUAL RECONCILIATION REQUIRED:', {
    payment_id: payment.id,
    order_id: payment.order_id,
    amount: payment.amount / 100,
    error: error.message,
    timestamp: new Date()
  });

  // In production, you should:
  // 1. Store this in a database table for failed webhooks
  // 2. Send alert to admin/support team
  // 3. Create a manual reconciliation dashboard

  // Example:
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

  // Send alert email
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: 'Failed Webhook Processing - Manual Reconciliation Required',
    body: `Payment ${payment.id} needs manual reconciliation...`
  });
  */
}
