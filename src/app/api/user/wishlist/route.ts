import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { get, set, isRedisAvailable, CACHE_TTL } from '@/lib/redis';

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

interface WishlistItem {
  id: string;
  name: string;
  price: string;
  image: string;
  handle: string;
  material: string;
  variantId: string;
}

// GET - Fetch user's wishlist
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = cookies();
    const authCookie = cookieStore.get('woo_auth_token');
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify and decode token
    let userId: string;
    try {
      const decoded = jwtDecode<JwtPayload>(authCookie.value);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        return NextResponse.json(
          { success: false, message: 'Token expired' },
          { status: 401 }
        );
      }
      
      userId = decoded.data.user.id;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch wishlist from Redis
    let wishlist = [];
    if (isRedisAvailable()) {
      try {
        const redisWishlist = await get(`wishlist:${userId}`);
        wishlist = redisWishlist || [];
      } catch (error) {
        console.error('Error fetching wishlist from Redis:', error);
        // Fallback to empty wishlist
      }
    }

    return NextResponse.json({
      success: true,
      wishlist
    });

  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save user's wishlist
export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookies
    const cookieStore = cookies();
    const authCookie = cookieStore.get('woo_auth_token');
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify and decode token
    let userId: string;
    try {
      const decoded = jwtDecode<JwtPayload>(authCookie.value);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        return NextResponse.json(
          { success: false, message: 'Token expired' },
          { status: 401 }
        );
      }
      
      userId = decoded.data.user.id;
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get wishlist data from request body
    const { wishlist } = await request.json();
    
    if (!Array.isArray(wishlist)) {
      return NextResponse.json(
        { success: false, message: 'Invalid wishlist data' },
        { status: 400 }
      );
    }

    // Save wishlist to Redis
    if (isRedisAvailable()) {
      try {
        // Store wishlist in Redis with 30-day expiration
        await set(`wishlist:${userId}`, wishlist, CACHE_TTL.WEEK * 4); // ~30 days

        return NextResponse.json({
          success: true,
          message: 'Wishlist saved successfully'
        });
      } catch (error) {
        console.error('Error saving wishlist to Redis:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to save wishlist' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Storage service unavailable' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Error saving wishlist:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
