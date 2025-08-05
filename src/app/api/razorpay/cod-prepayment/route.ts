import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { calculateCODAmounts } from '@/lib/codPrepayment';

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

    console.log('COD prepayment signature verified successfully');

    // Create COD order in WooCommerce with special meta data
    const orderId = await createCODWooCommerceOrder({
      address,
      cartItems,
      shipping,
      paymentDetails: {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        signature: razorpay_signature
      }
    });

    return NextResponse.json({
      success: true,
      orderId: orderId,
      message: 'COD convenience fee paid successfully. Order confirmed for Cash on Delivery.'
    });

  } catch (error: any) {
    console.error('COD prepayment verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'COD prepayment verification failed' },
      { status: 500 }
    );
  }
}

async function createCODWooCommerceOrder(orderData: any): Promise<string> {
  try {
    // Validate WooCommerce credentials
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      throw new Error('WooCommerce credentials not configured');
    }

    // Calculate amounts for COD
    const subtotal = orderData.cartItems.reduce((total: number, item: any) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return total + (price * item.quantity);
    }, 0);

    const codAmounts = calculateCODAmounts(subtotal, orderData.shipping.cost);

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
      line_items: orderData.cartItems.map((item: any) => ({
        product_id: parseInt(item.productId),
        variation_id: item.variationId ? parseInt(item.variationId) : undefined,
        quantity: item.quantity
      })),
      shipping_lines: [{
        method_id: orderData.shipping.id,
        method_title: orderData.shipping.name,
        total: orderData.shipping.cost.toString()
      }],
      // Add COD convenience fee as a fee line
      fee_lines: [{
        name: 'COD Convenience Fee',
        total: '100.00',
        tax_status: 'none'
      }],
      payment_method: 'cod_prepaid',
      payment_method_title: 'Cash on Delivery (Convenience Fee Paid)',
      set_paid: false, // Order not fully paid yet
      status: 'pending', // Set to pending until delivery
      meta_data: [
        {
          key: 'payment_method_type',
          value: 'cod_prepaid'
        },
        {
          key: 'cod_convenience_fee',
          value: '100.00'
        },
        {
          key: 'cod_convenience_fee_paid',
          value: 'yes'
        },
        {
          key: 'cod_amount_due_on_delivery',
          value: codAmounts.codAmount.toString()
        },
        {
          key: 'cod_total_cost',
          value: codAmounts.totalCost.toString()
        },
        {
          key: 'cod_prepaid_razorpay_payment_id',
          value: orderData.paymentDetails.payment_id
        },
        {
          key: 'cod_prepaid_razorpay_order_id',
          value: orderData.paymentDetails.order_id
        },
        {
          key: 'cod_prepaid_razorpay_signature',
          value: orderData.paymentDetails.signature
        },
        {
          key: 'payment_gateway',
          value: 'razorpay_cod_prepaid'
        },
        {
          key: 'delivery_instructions',
          value: `Customer has paid ₹100 convenience fee online. Collect ₹${codAmounts.codAmount} cash on delivery.`
        }
      ]
    };

    console.log('Creating COD WooCommerce order with payload:', JSON.stringify(orderPayload, null, 2));

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
    console.log('COD WooCommerce order created successfully:', order.id);

    // Send COD order confirmation email
    await sendCODOrderConfirmationEmail(order, orderData.address, codAmounts);

    return order.id.toString();

  } catch (error: any) {
    console.error('Error creating COD WooCommerce order:', error);
    throw new Error(`Failed to create COD order: ${error.message}`);
  }
}

async function sendCODOrderConfirmationEmail(order: any, address: any, codAmounts: any): Promise<void> {
  try {
    console.log(`COD Order confirmation email should be sent for order ${order.id}`);
    console.log(`Customer: ${address.firstName} ${address.lastName}`);
    console.log(`Convenience fee paid: ₹100`);
    console.log(`Amount to pay on delivery: ₹${codAmounts.codAmount}`);
    console.log(`Total cost: ₹${codAmounts.totalCost}`);

    // You can implement email sending here using services like:
    // - Nodemailer with SMTP
    // - SendGrid
    // - AWS SES
    // - WooCommerce's built-in email system (via webhook)

  } catch (error) {
    console.error('Error sending COD confirmation email:', error);
    // Don't throw error here as order creation was successful
  }
}