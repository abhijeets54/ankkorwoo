import { NextRequest, NextResponse } from 'next/server';
import { revalidateProductAction, revalidateAllAction } from '@/lib/actions';

// Revalidation handler for WooCommerce
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, type } = body;

    if (type === 'product' && handle) {
      await revalidateProductAction(handle);
      return NextResponse.json({ 
        revalidated: true,
        type: 'product',
        handle,
        timestamp: Date.now() 
      });
    }

    if (type === 'all') {
      await revalidateAllAction();
      return NextResponse.json({ 
        revalidated: true,
        type: 'all',
        timestamp: Date.now() 
      });
    }

    // If type is not specified or not recognized
    return NextResponse.json({ 
      revalidated: false,
      error: 'Invalid revalidation type or missing handle',
      timestamp: Date.now() 
    }, { status: 400 });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ 
      revalidated: false,
      error: 'Revalidation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

// Optional: Add a GET handler for testing the endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');
  const type = searchParams.get('type') || 'product';

  try {
    if (type === 'product' && handle) {
      await revalidateProductAction(handle);
      return NextResponse.json({ 
        revalidated: true,
        type: 'product',
        handle,
        timestamp: Date.now() 
      });
    }

    if (type === 'all') {
      await revalidateAllAction();
      return NextResponse.json({ 
        revalidated: true,
        type: 'all',
        timestamp: Date.now() 
      });
    }

    return NextResponse.json({ 
      revalidated: false,
      error: 'Invalid parameters. Use ?handle=product-handle or ?type=all',
      timestamp: Date.now() 
    }, { status: 400 });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ 
      revalidated: false,
      error: 'Revalidation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
} 