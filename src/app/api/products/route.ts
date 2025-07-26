import { NextRequest, NextResponse } from 'next/server';
import * as woocommerce from '@/lib/woocommerce';

// Disable caching for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const handle = searchParams.get('handle');
    const query = searchParams.get('query');
    const collection = searchParams.get('collection');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const sort = searchParams.get('sort');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 20;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;

    let products;

    if (handle) {
      // Get a single product by handle
      products = await woocommerce.getProductBySlug(handle);
      return NextResponse.json({ product: products });
    } else if (query) {
      // Search products
      products = await woocommerce.searchProducts(query, { limit, page });
    } else if (collection || category) {
      // Get products by collection/category
      const categorySlug = collection || category;
      products = await woocommerce.getProductsByCategory(categorySlug as string, { limit, page, sort });
    } else if (tag) {
      // Get products by tag
      products = await woocommerce.getProductsByTag(tag, { limit, page, sort });
    } else {
      // Get all products
      products = await woocommerce.getAllProducts({ limit, page, sort });
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
} 