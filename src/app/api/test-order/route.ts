import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

/**
 * Test endpoint to create an order in WooCommerce without payment
 * This is for testing the order creation and fetching flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, cartItems, shipping } = body;

    // Get customer ID from JWT token if available
    let customerId: number | null = null;
    try {
      const cookieStore = cookies();
      const authCookie = cookieStore.get('woo_auth_token');
      console.log('Auth cookie exists:', !!authCookie);

      if (authCookie && authCookie.value) {
        const decodedToken = jwtDecode<{ data: { user: { id: string } } }>(authCookie.value);
        console.log('Decoded token:', JSON.stringify(decodedToken, null, 2));

        if (decodedToken?.data?.user?.id) {
          customerId = parseInt(decodedToken.data.user.id);
          console.log('✅ Successfully extracted customer ID:', customerId);
        } else {
          console.log('❌ Could not find customer ID in token structure');
        }
      }
    } catch (error: any) {
      console.log('❌ Error extracting customer ID:', error.message);
    }

    console.log('Final customer ID to use:', customerId);

    // Validate required fields
    if (!address || !cartItems || !shipping) {
      return NextResponse.json(
        { success: false, message: 'Missing order data' },
        { status: 400 }
      );
    }

    console.log('Creating test order with data:', {
      address,
      cartItemsCount: cartItems.length,
      cartItems: JSON.stringify(cartItems, null, 2),
      shipping
    });

    // Create order in WooCommerce
    const orderId = await createWooCommerceTestOrder({
      address,
      cartItems,
      shipping,
      customerId
    });

    return NextResponse.json({
      success: true,
      orderId: orderId,
      message: 'Test order created successfully'
    });

  } catch (error: any) {
    console.error('Test order creation error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Test order creation failed' },
      { status: 500 }
    );
  }
}

async function createWooCommerceTestOrder(orderData: any): Promise<string> {
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
    const orderPayload: any = {
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

        // Add variation_id if present and valid
        if (item.variationId) {
          const variationIdInt = parseInt(item.variationId);
          if (!isNaN(variationIdInt) && variationIdInt > 0) {
            lineItem.variation_id = variationIdInt;
          }
        }

        console.log('Line item created:', lineItem);
        return lineItem;
      }),
      shipping_lines: [{
        method_id: orderData.shipping.id,
        method_title: orderData.shipping.name,
        total: orderData.shipping.cost.toString()
      }],
      payment_method: 'test_order',
      payment_method_title: 'Test Order (No Payment)',
      set_paid: true, // Mark as paid for testing
      status: 'processing'
    };

    // Add customer ID if available
    if (orderData.customerId) {
      orderPayload.customer_id = orderData.customerId;
      console.log('Associating order with customer ID:', orderData.customerId);
    }

    // Add metadata
    orderPayload.meta_data = [
        {
          key: 'test_order',
          value: 'true'
        },
        {
          key: 'test_timestamp',
          value: new Date().toISOString()
        }
      ];

    console.log('Creating WooCommerce test order with payload:', JSON.stringify(orderPayload, null, 2));

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
      console.error('WooCommerce API error response:', JSON.stringify(errorData, null, 2));
      console.error('WooCommerce API status:', response.status);

      // Extract more detailed error information
      let errorMessage = errorData.message || response.statusText;
      if (errorData.data && errorData.data.params) {
        errorMessage += ` - Invalid params: ${JSON.stringify(errorData.data.params)}`;
      }

      throw new Error(`WooCommerce API error: ${errorMessage}`);
    }

    const order = await response.json();
    console.log('WooCommerce test order created successfully:', order.id);

    return order.id.toString();

  } catch (error: any) {
    console.error('Error creating WooCommerce test order:', error);
    throw new Error(`Failed to create test order: ${error.message}`);
  }
}
