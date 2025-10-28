import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetch order details using WooCommerce REST API
 * This is an alternative to the GraphQL endpoint
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get WooCommerce credentials
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { success: false, message: 'WooCommerce credentials not configured' },
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
      console.error('WooCommerce API error:', errorData);

      if (response.status === 404) {
        return NextResponse.json(
          { success: false, message: 'Order not found' },
          { status: 404 }
        );
      }

      throw new Error(errorData.message || 'Failed to fetch order');
    }

    const order = await response.json();

    // Transform REST API response to match GraphQL structure
    const transformedOrder = {
      id: `order_${order.id}`,
      databaseId: order.id,
      date: order.date_created,
      status: order.status,
      total: order.total,
      subtotal: order.line_items.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0).toString(),
      shippingTotal: order.shipping_total,
      totalTax: order.total_tax,
      paymentMethodTitle: order.payment_method_title,
      billing: {
        firstName: order.billing.first_name,
        lastName: order.billing.last_name,
        address1: order.billing.address_1,
        address2: order.billing.address_2,
        city: order.billing.city,
        state: order.billing.state,
        postcode: order.billing.postcode,
        country: order.billing.country,
        email: order.billing.email,
        phone: order.billing.phone,
      },
      shipping: {
        firstName: order.shipping.first_name,
        lastName: order.shipping.last_name,
        address1: order.shipping.address_1,
        address2: order.shipping.address_2,
        city: order.shipping.city,
        state: order.shipping.state,
        postcode: order.shipping.postcode,
        country: order.shipping.country,
      },
      lineItems: {
        nodes: order.line_items.map((item: any) => ({
          product: {
            node: {
              id: `product_${item.product_id}`,
              name: item.name,
              image: item.image ? {
                sourceUrl: item.image.src,
                altText: item.name,
              } : null,
            },
          },
          quantity: item.quantity,
          total: item.total,
        })),
      },
    };

    return NextResponse.json({
      success: true,
      order: transformedOrder,
    });

  } catch (error: any) {
    console.error('Error fetching order details:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch order details',
      },
      { status: 500 }
    );
  }
}
