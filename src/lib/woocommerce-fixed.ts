// WooCommerce GraphQL API integration - Fixed according to official documentation
import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';

// WooCommerce store configuration
export const wooConfig = {
  storeUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://your-wordpress-site.com',
  graphqlUrl: process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql',
  apiVersion: 'v1',
};

// Check if code is running on client or server
const isClient = typeof window !== 'undefined';

// Initialize GraphQL client with proper headers for CORS
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';
const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Types based on WooCommerce GraphQL schema
export interface WooProduct {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  type: string;
  image: {
    sourceUrl: string;
    altText: string;
  };
  galleryImages: {
    nodes: Array<{
      sourceUrl: string;
      altText: string;
    }>;
  };
  // Pricing fields are only available on specific product types
  price?: string;
  regularPrice?: string;
  salePrice?: string;
  onSale?: boolean;
  stockStatus?: string;
  stockQuantity?: number;
  attributes?: {
    nodes: Array<{
      name: string;
      options: string[];
    }>;
  };
  variations?: {
    nodes: Array<{
      id: string;
      databaseId: number;
      name: string;
      price: string;
      regularPrice: string;
      salePrice: string;
      stockStatus: string;
      stockQuantity: number;
      attributes: {
        nodes: Array<{
          name: string;
          value: string;
        }>;
      };
    }>;
  };
  productTags?: {
    nodes: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  };
  productCategories?: {
    nodes: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  };
}

interface ProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: WooProduct[];
  };
}

interface ProductResponse {
  product: WooProduct;
}

// GraphQL fragments based on official WooCommerce GraphQL documentation
const PRODUCT_FRAGMENT = gql`
  fragment ProductFields on Product {
    id
    databaseId
    name
    slug
    description
    shortDescription
    type
    image {
      sourceUrl
      altText
    }
    galleryImages {
      nodes {
        sourceUrl
        altText
      }
    }
    ... on SimpleProduct {
      price
      regularPrice
      salePrice
      onSale
      stockStatus
      stockQuantity
    }
    ... on VariableProduct {
      price
      regularPrice
      salePrice
      onSale
      stockStatus
      stockQuantity
      attributes {
        nodes {
          name
          options
        }
      }
    }
  }
`;

const VARIABLE_PRODUCT_FRAGMENT = gql`
  fragment VariableProductWithVariations on VariableProduct {
    attributes {
      nodes {
        name
        options
      }
    }
    variations {
      nodes {
        id
        databaseId
        name
        price
        regularPrice
        salePrice
        stockStatus
        stockQuantity
        attributes {
          nodes {
            name
            value
          }
        }
      }
    }
  }
`;

// Queries
const GET_PRODUCTS = gql`
  query GetProducts(
    $first: Int
    $after: String
    $where: RootQueryToProductConnectionWhereArgs
  ) {
    products(first: $first, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...ProductFields
        ... on VariableProduct {
          ...VariableProductWithVariations
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
  ${VARIABLE_PRODUCT_FRAGMENT}
`;

const GET_PRODUCT_BY_SLUG = gql`
  query GetProductBySlug($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      ...ProductFields
      ... on VariableProduct {
        ...VariableProductWithVariations
      }
    }
  }
  ${PRODUCT_FRAGMENT}
  ${VARIABLE_PRODUCT_FRAGMENT}
`;

const GET_PRODUCT_BY_SLUG_WITH_TAGS = gql`
  query GetProductBySlugWithTags($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      ...ProductFields
      ... on VariableProduct {
        ...VariableProductWithVariations
      }
      productTags {
        nodes {
          id
          name
          slug
        }
      }
      productCategories {
        nodes {
          id
          name
          slug
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
  ${VARIABLE_PRODUCT_FRAGMENT}
`;

/**
 * Fetch data from WooCommerce GraphQL API with caching and revalidation
 */
export async function fetchFromWooCommerce<T = Record<string, any>>(
  query: string, 
  variables = {}, 
  tags: string[] = [], 
  revalidate = 60
): Promise<T> {
  try {
    // Use different approaches for client and server
    if (isClient) {
      // When on client, use our proxy API route to avoid CORS issues
      const proxyEndpoint = '/api/graphql';
      
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      };

      const response = await fetch(proxyEndpoint, fetchOptions);

      if (!response.ok) {
        throw new Error(`GraphQL API responded with status ${response.status}`);
      }

      const { data, errors } = await response.json();

      if (errors) {
        console.error('GraphQL Errors:', errors);
        throw new Error(errors[0].message);
      }

      return data as T;
    } else {
      // Server-side code can directly access the WooCommerce GraphQL endpoint
      const fetchOptions: RequestInit & { next?: { tags?: string[], revalidate?: number } } = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        next: {}
      };

      // Add cache tags if provided
      if (tags && tags.length > 0) {
        fetchOptions.next!.tags = tags;
      }

      // Add revalidation if provided
      if (revalidate !== undefined) {
        fetchOptions.next!.revalidate = revalidate;
      }

      const response = await fetch(wooConfig.graphqlUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(`WooCommerce GraphQL API responded with status ${response.status}`);
      }

      const { data, errors } = await response.json();

      if (errors) {
        console.error('GraphQL Errors:', errors);
        throw new Error(errors[0].message);
      }

      return data as T;
    }
  } catch (error) {
    console.error('Error fetching from WooCommerce:', error);
    throw error;
  }
}

// Export the main functions
export async function getProducts(
  variables: {
    first?: number;
    after?: string;
    where?: any;
  } = {}
) {
  try {
    const data = await fetchFromWooCommerce<ProductsResponse>(
      GET_PRODUCTS, 
      {
        first: variables.first || 12,
        after: variables.after || null,
        where: variables.where || {}
      },
      ['products'],
      60
    );
    return data.products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
}

export async function getProductBySlugWithTags(slug: string): Promise<WooProduct | null> {
  try {
    const data = await fetchFromWooCommerce<ProductResponse>(
      GET_PRODUCT_BY_SLUG_WITH_TAGS, 
      { slug }, 
      [`product-${slug}`, 'products'], 
      60
    );
    return data.product;
  } catch (error) {
    console.error(`Error fetching product with slug ${slug}:`, error);
    return null;
  }
}

export async function getAllProducts(first = 20) {
  try {
    const data = await getProducts({ first });
    return data?.nodes || [];
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
}
