import { NextRequest, NextResponse } from 'next/server';
import { isRedisAvailable } from '@/lib/redis';
import redis from '@/lib/redis';
import { jwtDecode } from 'jwt-decode';

// JWT token interface
interface JwtPayload {
  exp: number;
  iat: number;
  data: {
    user: {
      id: string;
      email: string;
    };
  };
}

export async function middleware(request: NextRequest) {
  const isRedisPath = request.nextUrl.pathname === '/api/status/redis';
  
  // Special path to check Redis status (useful for debugging)
  if (isRedisPath) {
    try {
      const redisAvailable = isRedisAvailable();
      
      if (!redisAvailable) {
        return NextResponse.json({
          status: 'not_configured',
          message: 'Redis is not configured. Check your environment variables.',
          timestamp: new Date().toISOString()
        }, { status: 200 });
      }
      
      // Test Redis connection with a simple operation
      const testKey = 'middleware:test';
      const testValue = Date.now().toString();
      await redis.set(testKey, testValue);
      const retrieved = await redis.get(testKey);
      
      if (retrieved === testValue) {
        return NextResponse.json({
          status: 'ok',
          message: 'Redis is configured and working properly',
          timestamp: new Date().toISOString()
        }, { status: 200 });
      } else {
        return NextResponse.json({
          status: 'error',
          message: 'Redis is configured but not working properly',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    } catch (error) {
      console.error('Redis check error:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Error checking Redis: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
  
  // Authentication check for protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/account') ||
    request.nextUrl.pathname.startsWith('/checkout');
  
  // Auth routes that should redirect to homepage if already logged in
  const isAuthRoute = 
    request.nextUrl.pathname.startsWith('/sign-in') || 
    request.nextUrl.pathname.startsWith('/sign-up');
  
  // Get auth token from cookies
  const authToken = request.cookies.get('woo_auth_token')?.value;

  // Debug logging for protected routes
  if (isProtectedRoute) {
    console.log('Middleware: Protected route accessed:', request.nextUrl.pathname);
    console.log('Middleware: Auth token present:', !!authToken);
    console.log('Middleware: All cookies:', request.cookies.getAll().map(c => c.name));
    if (authToken) {
      console.log('Middleware: Token length:', authToken.length);
      console.log('Middleware: Token starts with:', authToken.substring(0, 20) + '...');
    }
  }

  // Check if user is authenticated
  let isAuthenticated = false;

  if (authToken) {
    try {
      // Verify token expiration
      const decoded = jwtDecode<JwtPayload>(authToken);
      const currentTime = Date.now() / 1000;

      if (decoded.exp > currentTime) {
        isAuthenticated = true;
        if (isProtectedRoute) {
          console.log('Middleware: User authenticated, token valid');
        }
      } else {
        // Token is expired - check if we have a refresh token
        const refreshToken = request.cookies.get('woo_refresh_token')?.value;
        
        if (refreshToken) {
          if (isProtectedRoute) {
            console.log('Middleware: Token expired, but refresh token available - allowing pass-through for client-side refresh');
          }
          // Allow the request to continue - the client-side auth context will handle the refresh
          // This prevents redirect loops while still allowing authentication to work
          isAuthenticated = true;
        } else {
          if (isProtectedRoute) {
            console.log('Middleware: Token expired and no refresh token available');
          }
        }
      }
    } catch (e) {
      console.error('Error decoding token in middleware:', e);
      // Token is invalid, so user is not authenticated
    }
  }
  
  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL('/sign-in', request.url);
    // Add the original URL as a query parameter to redirect back after login
    signInUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // Redirect authenticated users away from auth pages to the homepage
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Continue for all other requests
  return NextResponse.next();
}

// Run middleware on the specified paths
export const config = {
  matcher: [
    '/api/status/redis',
    '/account/:path*',
    '/checkout/:path*',
    '/sign-in',
    '/sign-up'
  ]
};