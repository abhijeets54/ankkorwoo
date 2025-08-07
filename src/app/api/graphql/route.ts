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

    // Log incoming header sizes for debugging
    const incomingCookie = request.headers.get('cookie');
    const incomingSession = request.headers.get('woocommerce-session');
    console.log('📏 GraphQL Proxy - Incoming cookie size:', incomingCookie?.length || 0);
    console.log('📏 GraphQL Proxy - Incoming session size:', incomingSession?.length || 0);

    // Get the origin for CORS
    const origin = request.headers.get('origin') || '';

    // Prepare headers for the request to WooCommerce
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NextJS-GraphQL-Proxy/1.0',
    };

    // Forward session token if present in the request (with size limit)
    const sessionHeader = request.headers.get('woocommerce-session');
    if (sessionHeader && sessionHeader.length < 4000) { // Limit session header size
      headers['woocommerce-session'] = sessionHeader;
    } else if (sessionHeader && sessionHeader.length >= 4000) {
      console.warn('⚠️ GraphQL Proxy - WooCommerce session header too large, skipping');
    }

    // Forward only essential cookies to avoid header size limits
    const cookie = request.headers.get('cookie');
    if (cookie) {
      // Filter out large cookies and only keep essential ones
      const essentialCookies = cookie
        .split(';')
        .filter(c => {
          const cookieName = c.trim().split('=')[0];
          // Only forward WooCommerce and authentication related cookies
          return cookieName.includes('woo') ||
                 cookieName.includes('auth') ||
                 cookieName.includes('session') ||
                 cookieName.includes('jwt');
        })
        .filter(c => c.length < 1000) // Limit individual cookie size
        .join(';');

      if (essentialCookies && essentialCookies.length < 2000) { // Limit total cookie header size
        headers['cookie'] = essentialCookies;
      } else if (essentialCookies.length >= 2000) {
        console.warn('⚠️ GraphQL Proxy - Cookie header too large, skipping');
      }
    }

    // Forward the request to WordPress GraphQL
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    console.log('🔄 GraphQL Proxy - Response status:', response.status);
    console.log('🔄 GraphQL Proxy - Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ GraphQL Proxy - Response not OK:', response.status, response.statusText);

      // Try to get response text for debugging
      const errorText = await response.text();
      console.error('❌ GraphQL Proxy - Error response body:', errorText);

      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    console.log('📄 GraphQL Proxy - Content-Type:', contentType);

    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('❌ GraphQL Proxy - Non-JSON response received:', responseText.substring(0, 500));
      throw new Error(`Expected JSON response but received: ${contentType}. Response: ${responseText.substring(0, 200)}`);
    }

    // Get the response data
    const data = await response.json();
    console.log('✅ GraphQL Proxy - Response data:', JSON.stringify(data, null, 2));

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