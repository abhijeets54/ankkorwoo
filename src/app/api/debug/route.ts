import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlugWithTags } from '@/lib/woocommerce';

export async function GET(request: NextRequest) {
  try {
    // Parse the URL to get query parameters
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');
    
    if (!handle) {
      return NextResponse.json(
        { error: 'Product handle is required' },
        { status: 400 }
      );
    }
    
    const product = await getProductBySlugWithTags(handle);
    
    if (!product) {
      return NextResponse.json(
        { error: `Product not found: ${handle}` },
        { status: 404 }
      );
    }
    
    // Return product data with focus on compareAtPrice fields
    return NextResponse.json({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      regularPrice: product.regularPrice,
      salePrice: product.salePrice,
      onSale: product.onSale,
      variations: product.variations?.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        price: node.price,
        regularPrice: node.regularPrice,
        salePrice: node.salePrice
      }))
    });
  } catch (error: any) {
    console.error('API: Error in debug route:', error);
    return NextResponse.json(
      { error: `Failed to fetch product: ${error.message}` },
      { status: 500 }
    );
  }
} 