import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if Razorpay credentials are configured
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({
        success: false,
        error: 'Razorpay credentials not configured',
        details: {
          keyId: razorpayKeyId ? 'Configured' : 'Missing',
          keySecret: razorpayKeySecret ? 'Configured' : 'Missing'
        }
      }, { status: 500 });
    }

    // Test Razorpay connection by fetching account details
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        success: false,
        error: 'Razorpay API authentication failed',
        details: errorData,
        status: response.status
      }, { status: response.status });
    }

    const accountData = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Razorpay connection successful',
      account: {
        id: accountData.id,
        name: accountData.name,
        email: accountData.email,
        status: accountData.status,
        live_mode: accountData.live_mode
      }
    });

  } catch (error) {
    console.error('Razorpay connection test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test Razorpay connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
