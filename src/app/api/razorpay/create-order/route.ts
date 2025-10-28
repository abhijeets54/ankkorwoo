import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, receipt, notes = {} } = body;

    // Validate input
    if (!amount || !receipt) {
      return NextResponse.json(
        { error: 'Amount and receipt are required' },
        { status: 400 }
      );
    }

    // Validate amount (in INR, will be converted to paise)
    if (typeof amount !== 'number' || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum amount is ₹1' },
        { status: 400 }
      );
    }

    // Convert amount to paise
    const amountInPaise = Math.round(amount * 100);

    // Validate Razorpay credentials
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials not configured');
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      );
    }

    // Log the request origin for debugging
    const origin = request.headers.get('origin') || 'unknown';
    console.log('Request origin:', origin);
    
    // Check if request is from localhost or approved domain
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isApprovedDomain = origin.includes('ankkor.in');
    
    if (!isLocalhost && !isApprovedDomain) {
      console.error('Invalid request origin:', origin);
      return NextResponse.json(
        { error: 'Domain not authorized for payments' },
        { status: 403 }
      );
    }

    // Initialize Razorpay SDK
    let Razorpay;
    try {
      Razorpay = require('razorpay');
    } catch (error) {
      console.error('Failed to load Razorpay SDK:', error);
      return NextResponse.json(
        { error: 'Payment gateway initialization failed' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // Log request data (excluding sensitive info)
    console.log('Creating Razorpay order with params:', {
      amount,
      receipt,
      noteKeys: Object.keys(notes),
      timestamp: new Date().toISOString()
    });

    // Create Razorpay order with error handling
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receipt,
        notes: notes,
        payment_capture: 1 // Auto capture payment
      });

      // Log success (excluding sensitive info)
      console.log('Razorpay order created successfully:', {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status
      });

      return NextResponse.json(razorpayOrder);
    } catch (error: any) {
      // Log detailed error for debugging
      console.error('Razorpay order creation failed:', {
        error: error.message,
        code: error.code,
        metadata: error.metadata,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString()
      });

      // Return appropriate error response
      return NextResponse.json(
        { 
          error: 'Payment gateway error',
          message: error.message,
          code: error.code
        },
        { status: error.statusCode || 500 }
      );
    }

  } catch (error: any) {
    console.error('Razorpay order creation error:', error);

    // Handle specific Razorpay errors
    if (error.statusCode) {
      return NextResponse.json(
        {
          error: error.error?.description || 'Razorpay API error',
          code: error.error?.code
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create Razorpay order' },
      { status: 500 }
    );
  }
}
