import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to verify webhook signature verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-wc-webhook-signature');
    
    console.log('=== Webhook Test Endpoint ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Body:', body);
    console.log('Signature:', signature);
    
    // Test signature verification
    const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
    console.log('Webhook secret configured:', !!webhookSecret);
    
    if (webhookSecret && signature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body, 'utf8')
        .digest('base64');
      
      console.log('Expected signature:', expectedSignature);
      console.log('Received signature:', signature);
      console.log('Signatures match:', signature === expectedSignature);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test webhook received',
      hasSignature: !!signature,
      hasSecret: !!webhookSecret,
      bodyLength: body.length
    });
    
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { error: 'Test webhook failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook test endpoint',
    status: 'active',
    secretConfigured: !!process.env.WOOCOMMERCE_WEBHOOK_SECRET
  });
}
