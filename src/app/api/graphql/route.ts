import { NextRequest, NextResponse } from 'next/server';

/**
 * GraphQL Proxy to handle CORS issues when connecting to WooCommerce
 * This endpoint forwards GraphQL requests to the WordPress site and handles CORS
 */
export async function POST(request: NextRequest) {
  try {
    // Get the GraphQL query from the request body
    const body = await request.json();

    // WordPress/WooCommerce GraphQL endpoint from env variables
    const graphqlEndpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://maroon-lapwing-781450.hostingersite.com/graphql';

    console.log('🔗 GraphQL Proxy - Using endpoint:', graphqlEndpoint);
    console.log('📊 GraphQL Proxy - Request body:', JSON.stringify(body, null, 2));

    // Get the origin for CORS
    const origin = request.headers.get('origin') || '';

    // Prepare headers for the request to WooCommerce
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Forward session token if present in the request
    const sessionHeader = request.headers.get('woocommerce-session');
    if (sessionHeader) {
      headers['woocommerce-session'] = sessionHeader;
    }

    // Forward cookies if present
    const cookie = request.headers.get('cookie');
    if (cookie) {
      headers['cookie'] = cookie;
    }

    // Forward the request to WordPress GraphQL
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    // Get the response data
    const data = await response.json();

    console.log('📊 GraphQL Proxy - Response status:', response.status);
    console.log('📊 GraphQL Proxy - Response data:', JSON.stringify(data, null, 2));

    // Prepare response headers - use actual origin instead of wildcard for credentials support
    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, woocommerce-session, cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin', // Important when using specific origins instead of wildcard
    };

    // Forward session token from WooCommerce response if present
    const responseSessionHeader = response.headers.get('woocommerce-session');
    if (responseSessionHeader) {
      responseHeaders['woocommerce-session'] = responseSessionHeader;
    }

    // Forward any cookies from the WordPress response
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      responseHeaders['set-cookie'] = setCookieHeader;
    }

    // Return the response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('GraphQL proxy error:', error);
    // Get the origin for error response
    const origin = request.headers.get('origin') || '';
    
    return NextResponse.json(
      { 
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error occurred' }] 
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, woocommerce-session, cookie',
          'Access-Control-Allow-Credentials': 'true',
          'Vary': 'Origin',
        },
      }
    );
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  // Get the origin for CORS
  const origin = request.headers.get('origin') || '';
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, woocommerce-session, cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    },
  });
} 