import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
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
      shipping,
      discount
    } = body;

    // Get customer ID from JWT token if available
    let customerId: number | null = null;
    try {
      const cookieStore = cookies();
      const authCookie = cookieStore.get('woo_auth_token');

      if (authCookie && authCookie.value) {
        const decodedToken = jwtDecode<{ data: { user: { id: string } } }>(authCookie.value);
        if (decodedToken?.data?.user?.id) {
          customerId = parseInt(decodedToken.data.user.id);
          console.log('✅ COD payment for customer ID:', customerId);
        }
      }
    } catch (error: any) {
      console.log('No customer ID found in token');
    }

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

    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (error: any) {
      console.error('Error fetching payment from Razorpay:', error);
      return NextResponse.json(
        { success: false, message: 'Unable to verify payment with gateway' },
        { status: 500 }
      );
    }

    // ✅ SECURITY: Verify payment status
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      console.error('COD convenience fee payment not successful. Status:', payment.status);
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

    // ✅ SECURITY: Verify COD convenience fee amount (should be ₹100)
    const paidAmount = payment.amount / 100; // Convert paise to rupees
    const expectedFee = 100;

    if (Math.abs(paidAmount - expectedFee) > 0.01) {
      console.error('COD convenience fee amount mismatch:', {
        expected: expectedFee,
        paid: paidAmount
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Convenience fee amount mismatch'
        },
        { status: 400 }
      );
    }

    console.log('COD convenience fee verification complete:', {
      payment_id: payment.id,
      status: payment.status,
      amount: paidAmount,
      method: payment.method
    });

    // Create COD order in WooCommerce with special meta data
    const orderId = await createCODWooCommerceOrder({
      address,
      cartItems,
      shipping,
      customerId,
      discount,
      paymentDetails: {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        signature: razorpay_signature,
        status: payment.status,
        method: payment.method
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

    // Apply discount to subtotal before calculating COD amounts
    const discountAmount = orderData.discount && orderData.discount.amount > 0 ? orderData.discount.amount : 0;
    const codAmounts = calculateCODAmounts(subtotal, orderData.shipping.cost, discountAmount);

    // Prepare order payload for WooCommerce REST API
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

        // Don't add meta_data - let WooCommerce handle variation attributes automatically
        // Adding meta_data can cause "Invalid parameter" errors

        console.log('Creating line item:', lineItem);
        return lineItem;
      }),
      shipping_lines: [{
        method_id: orderData.shipping.id,
        method_title: orderData.shipping.name,
        total: orderData.shipping.cost.toString()
      }],
      // Add COD convenience fee and discount as fee lines
      fee_lines: [
        {
          name: 'COD Convenience Fee',
          total: '100.00',
          tax_status: 'none'
        }
      ],
      payment_method: 'cod_prepaid',
      payment_method_title: 'Cash on Delivery (Convenience Fee Paid)',
      set_paid: false, // Order not fully paid yet
      status: 'pending' // Set to pending until delivery
    };

    // Add discount as a negative fee if present
    if (orderData.discount && orderData.discount.amount > 0) {
      orderPayload.fee_lines.push({
        name: `Discount (${orderData.discount.code})`,
        total: (-orderData.discount.amount).toString(),
        tax_status: 'none'
      });

      console.log('Adding discount to COD order:', {
        code: orderData.discount.code,
        amount: orderData.discount.amount
      });
    }

    // Add customer ID if available
    if (orderData.customerId) {
      orderPayload.customer_id = orderData.customerId;
      console.log('✅ Associating COD order with customer ID:', orderData.customerId);
    }

    // Add metadata
    orderPayload.meta_data = [
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
      ];

    // Add discount metadata if applied
    if (orderData.discount && orderData.discount.amount > 0) {
      orderPayload.meta_data.push(
        {
          key: 'discount_code',
          value: orderData.discount.code
        },
        {
          key: 'discount_amount',
          value: orderData.discount.amount.toString()
        }
      );
    }

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
    console.log('COD WooCommerce order created successfully:', order.id);

    // Send COD order confirmation email via Resend (backup to WooCommerce emails)
    await sendCODOrderConfirmationEmail(order, orderData, codAmounts);

    return order.id.toString();

  } catch (error: any) {
    console.error('Error creating COD WooCommerce order:', error);
    throw new Error(`Failed to create COD order: ${error.message}`);
  }
}

async function sendCODOrderConfirmationEmail(order: any, orderData: any, codAmounts: any): Promise<void> {
  try {
    // Import Resend email service
    const { sendOrderConfirmationEmail: sendEmail } = await import('@/lib/send-email');

    // Calculate total from orderData
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
        paymentMethod: 'cod'
      }
    });

    console.log('✅ COD order confirmation email sent via Resend for order:', order.id);
    console.log(`   Convenience fee paid: ₹100, Amount on delivery: ₹${codAmounts.codAmount}`);
  } catch (error) {
    console.error('❌ Error sending COD confirmation email (non-critical):', error);
    // Don't throw error here as order creation was successful
    // WooCommerce emails should still be sent as primary notification
  }
}