import { NextRequest, NextResponse } from 'next/server';
import { reconcileAllProducts, reconcileInventory, reconcileProductByHandle } from '@/lib/reconciliation';

/**
 * API route for manually triggering data reconciliation with Shopify
 * This can be called via CRON or manually when needed
 */

// POST endpoint for triggering reconciliation
export async function POST(request: NextRequest) {
  try {
    // Check security - use a token for validation
    const providedToken = request.headers.get('x-api-key');
    const validToken = process.env.SHOPIFY_REVALIDATION_SECRET;
    
    if (!providedToken || providedToken !== validToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body to determine what to reconcile
    const body = await request.json().catch(() => ({}));
    const { type = 'inventory', handle, force = false } = body;
    
    let result;
    
    switch (type) {
      case 'all-products':
        // Reconcile all product data (heavy operation)
        result = await reconcileAllProducts();
        break;
        
      case 'inventory':
        // Reconcile just inventory data (lighter operation)
        result = await reconcileInventory(handle);
        break;
        
      case 'product':
        // Reconcile a specific product
        if (!handle) {
          return NextResponse.json(
            { success: false, error: 'Product handle is required for type "product"' },
            { status: 400 }
          );
        }
        result = await reconcileProductByHandle(handle);
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown reconciliation type: ${type}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json(
      { success: true, type, handle, result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in reconciliation API:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint for status check
export async function GET(request: NextRequest) {
  // Simple status check - useful for monitoring
  return NextResponse.json(
    { status: 'Reconciliation API is active' },
    { status: 200 }
  );
} 