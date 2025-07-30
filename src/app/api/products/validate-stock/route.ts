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

// GraphQL query for multiple products stock
const GET_PRODUCTS_STOCK = gql`
  query GetProductsStock($ids: [ID!]!) {
    products(where: { include: $ids }) {
      nodes {
        id
        databaseId
        ... on SimpleProduct {
          stockStatus
          stockQuantity
          manageStock
        }
        ... on VariableProduct {
          stockStatus
          stockQuantity
          manageStock
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
        ... on ExternalProduct {
          stockStatus
        }
        ... on GroupProduct {
          stockStatus
        }
      }
    }
  }
`;

// GraphQL query for variations stock
const GET_VARIATIONS_STOCK = gql`
  query GetVariationsStock($ids: [ID!]!) {
    productVariations(where: { include: $ids }) {
      nodes {
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
  }
`;

interface StockValidationItem {
  productId: string;
  variationId?: string;
  quantity: number;
}

interface StockValidationResult {
  productId: string;
  variationId?: string;
  available: boolean;
  stockStatus?: string;
  stockQuantity?: number;
  requestedQuantity: number;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items }: { items: StockValidationItem[] } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Separate products and variations
    const productIds = items
      .filter(item => !item.variationId)
      .map(item => item.productId);
    
    const variationIds = items
      .filter(item => item.variationId)
      .map(item => item.variationId!);

    // Fetch stock data in parallel
    const [productsResponse, variationsResponse] = await Promise.all([
      productIds.length > 0 
        ? graphQLClient.request(GET_PRODUCTS_STOCK, { ids: productIds })
        : Promise.resolve({ products: { nodes: [] } }),
      variationIds.length > 0
        ? graphQLClient.request(GET_VARIATIONS_STOCK, { ids: variationIds })
        : Promise.resolve({ productVariations: { nodes: [] } })
    ]);

    // Create lookup maps
    const productsMap = new Map();
    productsResponse.products?.nodes?.forEach((product: any) => {
      productsMap.set(product.databaseId.toString(), product);
    });

    const variationsMap = new Map();
    variationsResponse.productVariations?.nodes?.forEach((variation: any) => {
      variationsMap.set(variation.databaseId.toString(), variation);
    });

    // Validate each item
    const validations: StockValidationResult[] = items.map(item => {
      const requestedQuantity = item.quantity;
      
      if (item.variationId) {
        // Validate variation
        const variation = variationsMap.get(item.variationId);
        
        if (!variation) {
          return {
            productId: item.productId,
            variationId: item.variationId,
            available: false,
            requestedQuantity,
            message: 'Variation not found'
          };
        }
        
        const isInStock = variation.stockStatus === 'IN_STOCK' || variation.stockStatus === 'instock';
        const hasEnoughStock = !variation.manageStock || 
          variation.stockQuantity === null || 
          variation.stockQuantity >= requestedQuantity;
        
        return {
          productId: item.productId,
          variationId: item.variationId,
          available: isInStock && hasEnoughStock,
          stockStatus: variation.stockStatus,
          stockQuantity: variation.stockQuantity,
          requestedQuantity,
          message: !isInStock 
            ? 'Product variation is out of stock'
            : !hasEnoughStock 
              ? `Only ${variation.stockQuantity} items available for this variation`
              : 'Available'
        };
      } else {
        // Validate simple product
        const product = productsMap.get(item.productId);
        
        if (!product) {
          return {
            productId: item.productId,
            available: false,
            requestedQuantity,
            message: 'Product not found'
          };
        }
        
        const isInStock = product.stockStatus === 'IN_STOCK' || product.stockStatus === 'instock';
        const hasEnoughStock = !product.manageStock || 
          product.stockQuantity === null || 
          product.stockQuantity >= requestedQuantity;
        
        return {
          productId: item.productId,
          available: isInStock && hasEnoughStock,
          stockStatus: product.stockStatus,
          stockQuantity: product.stockQuantity,
          requestedQuantity,
          message: !isInStock 
            ? 'Product is out of stock'
            : !hasEnoughStock 
              ? `Only ${product.stockQuantity} items available`
              : 'Available'
        };
      }
    });

    // Cache the validation results briefly (only if Redis is available)
    if (redis) {
      try {
        const cacheKey = `stock_validation:${Date.now()}`;
        await redis.set(cacheKey, validations, 30); // 30 seconds TTL
      } catch (cacheError) {
        console.warn('Cache write failed, continuing without cache:', cacheError);
      }
    }

    const allAvailable = validations.every(v => v.available);
    const unavailableCount = validations.filter(v => !v.available).length;

    return NextResponse.json({
      validations,
      allAvailable,
      summary: {
        totalItems: items.length,
        availableItems: items.length - unavailableCount,
        unavailableItems: unavailableCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stock validation error:', error);
    return NextResponse.json(
      { 
        error: 'Stock validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
