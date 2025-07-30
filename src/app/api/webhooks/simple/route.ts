import { NextRequest, NextResponse } from 'next/server';

// Very simple webhook endpoint for testing
export async function POST(request: NextRequest) {
  console.log('=== Simple Webhook Test ===');
  
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('Headers received:', headers);
    console.log('Body length:', body.length);
    console.log('Body preview:', body.substring(0, 100));
    
    return NextResponse.json({
      success: true,
      message: 'Simple webhook received successfully',
      timestamp: new Date().toISOString(),
      bodyLength: body.length,
      hasSignature: !!headers['x-wc-webhook-signature']
    });
    
  } catch (error) {
    console.error('Simple webhook error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple webhook test endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  });
}
