import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get the webhook payload
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('No Razorpay signature found in webhook');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Razorpay webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Parse the webhook payload
    const event = JSON.parse(body);
    const { event: eventType } = event;

    console.log('📮 Received Razorpay webhook:', eventType);

    // Handle different event types
    switch (eventType) {
      case 'payment.captured': {
        const { payload } = event;
        const { payment } = payload;
        
        // Update WooCommerce order status
        await updateWooCommerceOrderStatus(payment.order_id, 'processing', {
          razorpay_payment_id: payment.id,
          payment_status: 'captured'
        });
        break;
      }

      case 'payment.failed': {
        const { payload } = event;
        const { payment } = payload;

        // Update WooCommerce order status
        await updateWooCommerceOrderStatus(payment.order_id, 'failed', {
          razorpay_payment_id: payment.id,
          failure_reason: payment.error_description
        });
        break;
      }

      // Add more event handlers as needed
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function updateWooCommerceOrderStatus(
  orderId: string, 
  status: string,
  metadata: Record<string, any>
) {
  try {
    // Get WooCommerce order ID from metadata
    const wooOrder = await fetch(
      `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3/orders`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(
            `${process.env.WOOCOMMERCE_CONSUMER_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`
          ).toString('base64')}`,
        },
        // Search by Razorpay order ID in metadata
        body: JSON.stringify({
          search: orderId,
          search_columns: ['meta_data._razorpay_order_id']
        })
      }
    );

    if (!wooOrder.ok) {
      throw new Error('Failed to fetch WooCommerce order');
    }

    const [order] = await wooOrder.json();
    if (!order?.id) {
      throw new Error('WooCommerce order not found');
    }

    // Update order status and metadata
    await fetch(
      `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3/orders/${order.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(
            `${process.env.WOOCOMMERCE_CONSUMER_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`
          ).toString('base64')}`,
        },
        body: JSON.stringify({
          status,
          meta_data: Object.entries(metadata).map(([key, value]) => ({
            key: `_razorpay_${key}`,
            value
          }))
        })
      }
    );

    console.log(`✅ Updated WooCommerce order ${order.id} status to ${status}`);

  } catch (error) {
    console.error('Failed to update WooCommerce order:', error);
    throw error;
  }
}