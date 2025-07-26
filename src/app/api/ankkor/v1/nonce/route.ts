import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Custom API route to fetch a valid WooCommerce Store API nonce
 * This endpoint tries multiple approaches to get a valid nonce
 */
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!baseUrl) {
      throw new Error('WooCommerce URL not configured');
    }

    // Get cart token from request header if available
    const cartToken = request.headers.get('Cart-Token');
    
    // Try to get nonce directly from WooCommerce Store API
    let nonce = await fetchNonceFromStoreApi(baseUrl, cartToken);
    
    // If that fails, try the WP REST API
    if (!nonce) {
      nonce = await fetchNonceFromWpApi(baseUrl, cartToken);
    }
    
    // If we still don't have a nonce, try a direct cart request
    if (!nonce) {
      nonce = await fetchNonceFromCartRequest(baseUrl, cartToken);
    }

    if (!nonce) {
      throw new Error('Could not obtain a valid nonce from any source');
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

/**
 * Try to fetch a nonce from the WooCommerce Store API
 */
async function fetchNonceFromStoreApi(baseUrl: string, cartToken: string | null): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (cartToken) {
      headers['Cart-Token'] = cartToken;
    }
    
    const response = await fetch(`${baseUrl}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies for session handling
      cache: 'no-store'
    });

    // Try to get nonce from headers
    const nonceHeader = response.headers.get('x-wc-store-api-nonce');
    if (nonceHeader) {
      return nonceHeader;
    }

    // If not in headers, check the response body
    const data = await response.json();
    
    // Some WooCommerce setups include the nonce in the response body extensions
    if (data.extensions && data.extensions.store_api_nonce) {
      return data.extensions.store_api_nonce;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching nonce from Store API:', error);
    return null;
  }
}

/**
 * Try to fetch a nonce from the WordPress REST API
 */
async function fetchNonceFromWpApi(baseUrl: string, cartToken: string | null): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (cartToken) {
      headers['Cart-Token'] = cartToken;
    }
    
    const response = await fetch(`${baseUrl}/wp-json`, {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies for session handling
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Look for nonce in the WP REST API response
    if (data && data.authentication && data.authentication.nonce) {
      return data.authentication.nonce;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching nonce from WP API:', error);
    return null;
  }
}

/**
 * Try to fetch a nonce by making a direct cart request
 */
async function fetchNonceFromCartRequest(baseUrl: string, cartToken: string | null): Promise<string | null> {
  try {
    // Try a different endpoint that might return a nonce
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (cartToken) {
      headers['Cart-Token'] = cartToken;
    }
    
    // Try the products endpoint
    const response = await fetch(`${baseUrl}/wp-json/wc/store/v1/products`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    // Try to get nonce from headers
    const nonceHeader = response.headers.get('x-wc-store-api-nonce');
    if (nonceHeader) {
      return nonceHeader;
    }

    return null;
  } catch (error) {
    console.error('Error fetching nonce from cart request:', error);
    return null;
  }
} 