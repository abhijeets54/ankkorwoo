import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    // Check if Razorpay credentials are configured
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({
        success: false,
        error: 'Razorpay credentials not configured'
      }, { status: 500 });
    }

    // Test order creation with minimal amount (₹1)
    const testOrderData = {
      amount: 100, // ₹1 in paise
      currency: 'INR',
      receipt: `test_receipt_${Date.now()}`,
      notes: {
        test: 'true',
        purpose: 'connection_test'
      }
    };

    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        success: false,
        error: 'Failed to create test order',
        details: errorData,
        status: response.status
      }, { status: response.status });
    }

    const orderData = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Test order created successfully',
      order: {
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        status: orderData.status,
        created_at: orderData.created_at
      }
    });

  } catch (error) {
    console.error('Razorpay test order error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create test order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
