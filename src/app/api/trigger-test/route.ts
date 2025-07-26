import { NextRequest, NextResponse } from 'next/server';
import { sendQStashTestMessage } from '@/lib/qstash';
import { scheduleInventorySync } from '@/lib/wooQstash';

/**
 * API route for triggering a QStash test message
 * This can be used to test the entire QStash flow
 */
export async function GET(request: NextRequest) {
  try {
    // Get the delay parameter if provided
    const { searchParams } = new URL(request.url);
    const delaySecondsParam = searchParams.get('delay');
    const delaySeconds = delaySecondsParam ? parseInt(delaySecondsParam, 10) : undefined;
    
    // Extra data to include in the test
    const testData = {
      source: 'trigger-test-api',
      userAgent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer')
    };
    
    // Send the test message
    const result = await sendQStashTestMessage(testData, delaySeconds);
    
    return NextResponse.json({
      status: result.success ? 'success' : 'error',
      ...result,
      message: result.success 
        ? `Test message sent successfully with ID ${result.messageId}` 
        : `Failed to send test message: ${result.error}`
    });
  } catch (error) {
    console.error('Error triggering QStash test:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Error triggering QStash test', 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for triggering a QStash test with custom data
 */
export async function POST(request: NextRequest) {
  try {
    // Get custom data from request body
    const body = await request.json();
    const { delaySeconds, ...customData } = body;
    
    // Send the test message
    const result = await sendQStashTestMessage(
      { 
        ...customData,
        source: 'trigger-test-api-post'
      }, 
      delaySeconds
    );
    
    return NextResponse.json({
      status: result.success ? 'success' : 'error',
      ...result,
      message: result.success 
        ? `Test message sent successfully with ID ${result.messageId}` 
        : `Failed to send test message: ${result.error}`
    });
  } catch (error) {
    console.error('Error triggering QStash test via POST:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Error triggering QStash test', 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH endpoint for scheduling inventory sync
 */
export async function PATCH() {
  try {
    const result = await scheduleInventorySync();
    
    return NextResponse.json({
      success: true,
      message: 'Inventory sync scheduled successfully',
      details: result
    });
  } catch (error) {
    console.error('Error scheduling inventory sync:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to schedule inventory sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 