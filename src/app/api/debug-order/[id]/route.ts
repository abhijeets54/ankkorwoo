import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check order details in WooCommerce
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;

    // Get WooCommerce credentials
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    // Fetch order from WooCommerce REST API
    const response = await fetch(`${wooUrl}/wp-json/wc/v3/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData },
        { status: response.status }
      );
    }

    const order = await response.json();

    return NextResponse.json({
      orderId: order.id,
      customerId: order.customer_id,
      customerIdType: typeof order.customer_id,
      status: order.status,
      total: order.total,
      billing: order.billing,
      paymentMethod: order.payment_method,
      paymentMethodTitle: order.payment_method_title,
      dateCreated: order.date_created,
      metadata: order.meta_data,
      fullOrder: order
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
