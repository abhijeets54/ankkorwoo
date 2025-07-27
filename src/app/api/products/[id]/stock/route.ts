import { NextRequest, NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';
import { Redis } from '@upstash/redis';

// Initialize Redis with fallback handling
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Initialize GraphQL client
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || '';
const graphQLClient = new GraphQLClient(endpoint);

// GraphQL query for product stock
const GET_PRODUCT_STOCK = gql`
  query GetProductStock($id: ID!, $idType: ProductIdType = DATABASE_ID) {
    product(id: $id, idType: $idType) {
      id
      databaseId
      stockStatus
      stockQuantity
      manageStock
      ... on VariableProduct {
        variations {
          nodes {
            id
            databaseId
            stockStatus
            stockQuantity
            manageStock
          }
        }
      }
    }
  }
`;

// GraphQL query for variation stock
const GET_VARIATION_STOCK = gql`
  query GetVariationStock($id: ID!) {
    productVariation(id: $id, idType: DATABASE_ID) {
      id
      databaseId
      stockStatus
      stockQuantity
      manageStock
      parent {
        node {
          id
          databaseId
        }
      }
    }
  }
`;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const variationId = searchParams.get('variation_id');
    const productId = params.id;

    // Check cache first for faster response (only if Redis is available)
    let cachedStock = null;
    if (redis) {
      try {
        const cacheKey = variationId
          ? `stock:variation:${variationId}`
          : `stock:product:${productId}`;

        cachedStock = await redis.get(cacheKey);
        if (cachedStock) {
          console.log('Returning cached stock data for:', cacheKey);
          return NextResponse.json(cachedStock);
        }
      } catch (cacheError) {
        console.warn('Cache read failed, continuing without cache:', cacheError);
      }
    }

    let stockData;

    if (variationId) {
      // Get variation stock
      const response = await graphQLClient.request(GET_VARIATION_STOCK, {
        id: variationId
      });
      
      if (!response.productVariation) {
        return NextResponse.json(
          { error: 'Variation not found' },
          { status: 404 }
        );
      }
      
      const variation = response.productVariation;
      stockData = {
        id: variation.databaseId,
        type: 'variation',
        stockStatus: variation.stockStatus,
        stockQuantity: variation.stockQuantity,
        manageStock: variation.manageStock,
        parentId: variation.parent?.node?.databaseId,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Get product stock
      const response = await graphQLClient.request(GET_PRODUCT_STOCK, {
        id: productId,
        idType: 'DATABASE_ID'
      });
      
      if (!response.product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      const product = response.product;
      stockData = {
        id: product.databaseId,
        type: 'product',
        stockStatus: product.stockStatus,
        stockQuantity: product.stockQuantity,
        manageStock: product.manageStock,
        variations: product.variations?.nodes?.map((v: any) => ({
          id: v.databaseId,
          stockStatus: v.stockStatus,
          stockQuantity: v.stockQuantity,
          manageStock: v.manageStock
        })),
        lastUpdated: new Date().toISOString()
      };
    }

    // Cache the result for 30 seconds (short TTL for real-time accuracy)
    if (redis) {
      try {
        const cacheKey = variationId
          ? `stock:variation:${variationId}`
          : `stock:product:${productId}`;
        await redis.set(cacheKey, stockData, 30);
      } catch (cacheError) {
        console.warn('Cache write failed, continuing without cache:', cacheError);
      }
    }

    return NextResponse.json(stockData);

  } catch (error) {
    console.error('Stock check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check stock',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint for bulk stock validation (useful for cart validation)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { items } = body; // Array of { productId, variationId?, quantity }
    
    const stockValidations = await Promise.all(
      items.map(async (item: any) => {
        try {
          const stockResponse = await GET(
            new NextRequest(`${request.url}?${item.variationId ? `variation_id=${item.variationId}` : ''}`),
            { params }
          );
          
          const stockData = await stockResponse.json();
          
          if (stockResponse.status !== 200) {
            return {
              productId: item.productId,
              variationId: item.variationId,
              available: false,
              error: stockData.error
            };
          }
          
          const isAvailable = stockData.stockStatus === 'IN_STOCK' || stockData.stockStatus === 'instock';
          const hasEnoughStock = !stockData.manageStock || 
            stockData.stockQuantity === null || 
            stockData.stockQuantity >= item.quantity;
          
          return {
            productId: item.productId,
            variationId: item.variationId,
            available: isAvailable && hasEnoughStock,
            stockStatus: stockData.stockStatus,
            stockQuantity: stockData.stockQuantity,
            requestedQuantity: item.quantity,
            message: !isAvailable 
              ? 'Product is out of stock'
              : !hasEnoughStock 
                ? `Only ${stockData.stockQuantity} items available`
                : 'Available'
          };
        } catch (error) {
          return {
            productId: item.productId,
            variationId: item.variationId,
            available: false,
            error: 'Stock validation failed'
          };
        }
      })
    );
    
    return NextResponse.json({
      validations: stockValidations,
      allAvailable: stockValidations.every(v => v.available)
    });
    
  } catch (error) {
    console.error('Bulk stock validation error:', error);
    return NextResponse.json(
      { error: 'Bulk stock validation failed' },
      { status: 500 }
    );
  }
}
