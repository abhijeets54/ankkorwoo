// This middleware is no longer needed as we're using Shopify customer accounts
// This file is kept for reference but is not used in the application

import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for request handling
 * - Added warmup functionality to trigger service initialization
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Warmup the application on certain requests to ensure services are initialized
  if (pathname === '/' || pathname === '/api/health') {
    try {
      // Call the init API to ensure services are running
      // This is done as a non-blocking fetch to avoid delaying the response
      fetch(`${request.nextUrl.origin}/api/init`).catch(err => {
        console.error('Error during warmup call:', err);
      });
    } catch (error) {
      // Don't block the request if there's an error with the warmup
      console.error('Error in warmup middleware:', error);
    }
  }

  // Return the request as-is to continue normal processing
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ['/', '/api/health', '/collections/:path*', '/products/:path*'],
}; 