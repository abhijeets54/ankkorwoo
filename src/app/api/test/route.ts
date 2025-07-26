import { NextRequest, NextResponse } from 'next/server';
import { getProducts, getCategories } from '@/lib/woocommerce';

// Add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET() {
  try {
    console.log('Testing WooCommerce connection...');
    console.log('GraphQL URL:', process.env.WOOCOMMERCE_GRAPHQL_URL);
    console.log('WordPress URL:', process.env.NEXT_PUBLIC_WORDPRESS_URL);

    // Test product fetching
    const products = await getProducts();

    // Test category fetching
    const categories = await getCategories();

    const response = NextResponse.json({
      success: true,
      message: 'WooCommerce API connection successful',
      data: {
        productsCount: products.nodes?.length || 0,
        categoriesCount: categories.nodes?.length || 0,
        graphqlUrl: process.env.WOOCOMMERCE_GRAPHQL_URL,
        wordpressUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL
      }
    });

    return addCorsHeaders(response);
  } catch (error) {
    console.error('WooCommerce API test failed:', error);
    const response = NextResponse.json({
      success: false,
      message: 'WooCommerce API connection failed',
      error: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    }, { status: 500 });

    return addCorsHeaders(response);
  }
}