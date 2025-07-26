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

    // Validate amount (should be in paise)
    if (typeof amount !== 'number' || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

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

    // Initialize Razorpay SDK
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: notes,
      payment_capture: 1 // Auto capture payment
    });

    console.log('Razorpay order created:', razorpayOrder.id);

    return NextResponse.json(razorpayOrder);

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
