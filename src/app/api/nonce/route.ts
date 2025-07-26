import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to fetch a valid WooCommerce Store API nonce
 * This endpoint makes a request to the WooCommerce site to get a fresh nonce
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!baseUrl) {
      throw new Error('WooCommerce URL not configured');
    }

    // Get cart token from request header if available
    const cartToken = request.headers.get('Cart-Token');
    
    // Make request to WooCommerce to get a nonce
    const response = await fetch(`${baseUrl}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cartToken ? { 'Cart-Token': cartToken } : {})
      },
      credentials: 'include', // Include cookies for session handling
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch nonce: ${response.status}`);
    }

    // Try to extract the nonce from the response headers
    let nonce = response.headers.get('X-WC-Store-API-Nonce');

    // If not in headers, check the response body
    if (!nonce) {
      const data = await response.json();
      
      // Some WooCommerce setups include the nonce in the response body extensions
      if (data.extensions && data.extensions.store_api_nonce) {
        nonce = data.extensions.store_api_nonce;
      }
    }

    if (!nonce) {
      throw new Error('No nonce returned from WooCommerce');
    }

    // Return the nonce
    return NextResponse.json({ nonce }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error fetching WooCommerce nonce:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred fetching the nonce'
      },
      { status: 500 }
    );
  }
} 