// WooCommerce GraphQL API integration - Fixed according to official documentation
import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';
import { validateProductId } from './wooInventoryMapping';

// WooCommerce store configuration
export const wooConfig = {
  storeUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://your-wordpress-site.com',
  graphqlUrl: process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql',
  apiVersion: 'v1',
};

// Session management for WooCommerce
let sessionToken: string | null = null;

export const getSessionToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('woo-session-token') || sessionToken;
  }
  return sessionToken;
};

export const setSessionToken = (token: string | null): void => {
  sessionToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('woo-session-token', token);
    } else {
      sessionStorage.removeItem('woo-session-token');
    }
  }
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

// Set auth token for authenticated requests
export const setAuthToken = (token: string) => {
  graphQLClient.setHeader('Authorization', `Bearer ${token}`);
};

// Clear auth token for unauthenticated requests
export const clearAuthToken = () => {
  graphQLClient.setHeaders({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });
};

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

export interface WooCategory {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  image?: {
    sourceUrl: string;
    altText: string;
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

interface CategoriesResponse {
  productCategories: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: WooCategory[];
  };
}

// GraphQL fragments
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

// Define a separate fragment for variable products with variations
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

const GET_CATEGORIES = gql`
  query GetCategories(
    $first: Int
    $after: String
    $where: RootQueryToProductCategoryConnectionWhereArgs
  ) {
    productCategories(first: $first, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        databaseId
        name
        slug
        description
        count
        image {
          sourceUrl
          altText
        }
      }
    }
  }
`;

// Fetch functions
export async function getProducts(
  variables: {
    first?: number;
    after?: string;
    where?: {
      categoryIn?: string[];
      tagIn?: string[];
      search?: string;
      onSale?: boolean;
      minPrice?: number;
      maxPrice?: number;
      orderby?: {
        field: string;
        order: string;
      }[];
    };
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

/**
 * Get variations for a variable product
 */
export async function getProductVariations(productId: number): Promise<any[]> {
  try {
    const query = gql`
      query GetProductVariations($id: ID!) {
        product(id: $id, idType: DATABASE_ID) {
          ... on VariableProduct {
            variations {
              nodes {
                id
                databaseId
                name
                price
                regularPrice
                salePrice
                stockStatus
                attributes {
                  nodes {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetchFromWooCommerce<{ product?: { variations?: { nodes: any[] } } }>(
      query,
      { id: productId },
      [`product-${productId}`, 'products'],
      60
    );

    return response.product?.variations?.nodes || [];
  } catch (error) {
    console.error('Error fetching product variations:', error);
    return [];
  }
}

/**
 * Get a product by its slug
 */
export async function getProductBySlug(slug: string): Promise<any> {
  try {
    const data = await fetchFromWooCommerce<ProductResponse>(
      GET_PRODUCT_BY_SLUG,
      { slug },
      [`product-${slug}`, 'products'],
      60
    );
    const product = data.product;

    // If it's a variable product, fetch variations separately
    if (product && product.type === 'VARIABLE') {
      const variations = await getProductVariations(product.databaseId);
      return { ...product, variations: { nodes: variations } };
    }

    return product;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
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

// Categories functionality is now handled by the more comprehensive getAllCategories function

// Helper function to format price
export function formatPrice(price: string | number): string {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numericPrice.toFixed(2);
}

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

      // Build the fetch options with session token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add session token if available
      const sessionToken = getSessionToken();
      if (sessionToken) {
        headers['woocommerce-session'] = `Session ${sessionToken}`;
      }

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
      };

      // Make the fetch request through our proxy
      const response = await fetch(proxyEndpoint, fetchOptions);

      if (!response.ok) {
        throw new Error(`GraphQL API responded with status ${response.status}`);
      }

      // Extract session token from response headers if available
      const responseSessionHeader = response.headers.get('woocommerce-session');
      if (responseSessionHeader) {
        const token = responseSessionHeader.replace('Session ', '');
        setSessionToken(token);
      }

      const { data, errors } = await response.json();

      if (errors) {
        console.error('GraphQL Errors:', errors);
        throw new Error(errors[0].message);
      }

      return data as T;
    } else {
      // Server-side code can directly access the WooCommerce GraphQL endpoint
      // Build the fetch options with cache control
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

      // Make the fetch request
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

/**
 * Base implementation of WooCommerce fetch that can be used by other modules
 * This provides a standardized way to make WooGraphQL API requests with retry logic
 * 
 * @param query GraphQL query to execute 
 * @param variables Variables for the GraphQL query
 * @param retries Number of retries in case of failure
 * @param delay Delay between retries in milliseconds
 * @returns The fetched data
 */
export async function wooGraphQLFetch<T = Record<string, any>>({ 
  query, 
  variables 
}: { 
  query: string; 
  variables?: any 
}, 
  retries = 3, 
  delay = 1000
): Promise<T> {
  let attemptCount = 0;
  let lastError = null;

  while (attemptCount < retries) {
    try {
      // Use fetchFromWooCommerce for the actual request, but ignore caching controls
      // as this is the low-level function that might be used in different contexts
      const data = await fetchFromWooCommerce(query, variables, [], 0) as T;
      return data;
    } catch (error) {
      lastError = error;
      attemptCount++;
      
      if (attemptCount < retries) {
        console.log(`Retrying request (${attemptCount}/${retries}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponential backoff
        delay *= 2;
      }
    }
  }

  console.error(`Failed after ${retries} attempts:`, lastError);
  throw lastError;
}

/**
 * Get products by category with cache tags for efficient revalidation
 * 
 * @param slug The category slug
 * @param first Number of products to fetch
 * @param revalidate Revalidation period in seconds (optional)
 * @returns The category with products
 */
export async function getCategoryProductsWithTags(slug: string, first = 20, revalidate = 60) {
  try {
    // Define cache tags for this category
    const tags = [`category-${slug}`, 'categories', 'products'];
    
    // Define response type
    interface CategoryResponse {
      productCategory?: {
        id: string;
        name: string;
        slug: string;
        description: string;
        products: {
          nodes: WooProduct[];
        };
      };
    }
    
    // Fetch the category with tags
    const data = await fetchFromWooCommerce<CategoryResponse>(
      QUERY_CATEGORY_PRODUCTS, 
      { slug, first }, 
      tags, 
      revalidate
    );
    
    return data?.productCategory || null;
  } catch (error) {
    console.error(`Error fetching category with slug ${slug}:`, error);
    throw error;
  }
}

// GraphQL query to fetch all products
export const QUERY_ALL_PRODUCTS = gql`
  query GetAllProducts($first: Int = 20) {
    products(first: $first) {
      nodes {
        id
        databaseId
        name
        slug
        description
        shortDescription
        productCategories {
          nodes {
            id
            name
            slug
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
          variations {
            nodes {
              stockStatus
              stockQuantity
            }
          }
        }
        image {
          id
          sourceUrl
          altText
        }
        galleryImages {
          nodes {
            id
            sourceUrl
            altText
          }
        }
        ... on VariableProduct {
          attributes {
            nodes {
              name
              options
            }
          }
        }
        ... on SimpleProduct {
          attributes {
            nodes {
              name
              options
            }
          }
        }
      }
    }
  }
`;

// GraphQL query to fetch products by category
export const QUERY_CATEGORY_PRODUCTS = gql`
  query GetProductsByCategory($slug: ID!, $first: Int = 20) {
    productCategory(id: $slug, idType: SLUG) {
      id
      name
      slug
      description
      products(first: $first) {
        nodes {
          id
          databaseId
          name
          slug
          ... on SimpleProduct {
            price
            regularPrice
            salePrice
            onSale
            stockStatus
          }
          ... on VariableProduct {
            price
            regularPrice
            salePrice
            onSale
            stockStatus
          }
          image {
            id
            sourceUrl
            altText
          }
        }
      }
    }
  }
`;

// GraphQL query to fetch all categories
export const QUERY_ALL_CATEGORIES = gql`
  query GetAllCategories($first: Int = 20) {
    productCategories(first: $first) {
      nodes {
        id
        databaseId
        name
        slug
        description
        count
        image {
          sourceUrl
          altText
        }
        children {
          nodes {
            id
            name
            slug
          }
        }
      }
    }
  }
`;

// GraphQL query to get cart contents - Updated for current WooGraphQL schema
export const QUERY_GET_CART = gql`
  query GetCart {
    cart {
      contents {
        nodes {
          key
          product {
            node {
              id
              databaseId
              name
              slug
              type
              image {
                sourceUrl
                altText
              }
            }
          }
          variation {
            node {
              id
              databaseId
              name
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
          quantity
          total
        }
      }
      subtotal
      total
      totalTax
      isEmpty
    }
  }
`;

// Mutation for customer login
export const MUTATION_LOGIN = gql`
  mutation LoginUser($username: String!, $password: String!) {
    login(input: {
      clientMutationId: "login"
      username: $username
      password: $password
    }) {
      authToken
      refreshToken
      user {
        id
        databaseId
        email
        firstName
        lastName
        nicename
        nickname
        username
      }
    }
  }
`;

// Get cart query - WooCommerce automatically creates a cart when needed
export const GET_CART = gql`
  query GetCart {
    cart {
      contents {
        nodes {
          key
          product {
            node {
              id
              databaseId
              name
              slug
              type
              image {
                sourceUrl
                altText
              }
            }
          }
          variation {
            node {
              id
              databaseId
              name
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
          quantity
          total
        }
      }
      subtotal
      total
      totalTax
      isEmpty
      contentsCount
    }
  }
`;

// Add to cart mutation - Updated for current WooGraphQL schema
export const ADD_TO_CART = gql`
  mutation AddToCart($productId: Int!, $variationId: Int, $quantity: Int, $extraData: String) {
    addToCart(
      input: {
        clientMutationId: "addToCart"
        productId: $productId
        variationId: $variationId
        quantity: $quantity
        extraData: $extraData
      }
    ) {
      cart {
        contents {
          nodes {
            key
            product {
              node {
                id
                databaseId
                name
                slug
                type
                image {
                  sourceUrl
                  altText
                }
              }
            }
            variation {
              node {
                id
                databaseId
                name
                attributes {
                  nodes {
                    name
                    value
                  }
                }
              }
            }
            quantity
            total
          }
        }
        subtotal
        total
        totalTax
        isEmpty
        contentsCount
      }
    }
  }
`;

// Remove from cart mutation - Updated for current WooGraphQL schema
export const MUTATION_REMOVE_FROM_CART = gql`
  mutation RemoveItemsFromCart($keys: [ID]!, $all: Boolean) {
    removeItemsFromCart(input: { keys: $keys, all: $all }) {
      cart {
        contents {
          nodes {
            key
            product {
              node {
                id
                databaseId
                name
                slug
                type
                image {
                  sourceUrl
                  altText
                }
              }
            }
            variation {
              node {
                id
                databaseId
                name
                attributes {
                  nodes {
                    name
                    value
                  }
                }
              }
            }
            quantity
            total
          }
        }
        subtotal
        total
        totalTax
        isEmpty
      }
    }
  }
`;

// Shipping and payment related queries
export const QUERY_SHIPPING_METHODS = gql`
  query GetShippingMethods {
    shippingMethods {
      nodes {
        id
        title
        description
        cost
      }
    }
  }
`;

export const QUERY_PAYMENT_GATEWAYS = gql`
  query GetPaymentGateways {
    paymentGateways {
      nodes {
        id
        title
        description
        enabled
      }
    }
  }
`;

// Implement core API methods

/**
 * Get all products with pagination
 */
export async function getAllProducts(first = 20) {
  try {
    const data = await wooGraphQLFetch({
      query: QUERY_ALL_PRODUCTS,
      variables: { first }
    });

    return data?.products?.nodes || [];
  } catch (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
}

/**
 * Get all categories with pagination
 */
export async function getAllCategories(first = 20) {
  try {
    const data = await wooGraphQLFetch({
      query: QUERY_ALL_CATEGORIES,
      variables: { first }
    });

    return data?.productCategories?.nodes || [];
  } catch (error) {
    console.error('Error fetching all categories:', error);
    return [];
  }
}

/**
 * Get product categories with pagination and filtering
 * @param variables Object containing:
 *   - first: Number of categories to return (default: 20)
 *   - after: Cursor for pagination
 *   - where: Filter criteria (parent, search, etc.)
 * @returns Object containing categories and pagination info
 */
export async function getCategories(
  variables: {
    first?: number;
    after?: string;
    where?: {
      parent?: number;
      search?: string;
    };
  } = {}
): Promise<{
  nodes: WooCategory[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}> {
  try {
    const result = await wooGraphQLFetch({
      query: QUERY_ALL_CATEGORIES,
      variables: {
        first: variables.first || 20,
        after: variables.after || null,
        where: variables.where || {}
      }
    });
    
    return {
      nodes: result.productCategories.nodes,
      pageInfo: result.productCategories.pageInfo
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null }
    };
  }
}

/**
 * Create a new cart by adding the first item - WooCommerce automatically creates cart
 */
export async function createCart(items: any[] = []) {
  try {
    if (items.length === 0) {
      // Just return an empty cart structure - WooCommerce will create cart when first item is added
      return {
        contents: { nodes: [] },
        subtotal: '0',
        total: '0',
        totalTax: '0',
        isEmpty: true,
        contentsCount: 0
      };
    }

    // Add the first item to create the cart
    const firstItem = items[0];
    const cart = await addToCart('', [firstItem]);

    // Add remaining items if any
    if (items.length > 1) {
      for (let i = 1; i < items.length; i++) {
        await addToCart('', [items[i]]);
      }
      // Get the updated cart
      return await getCart();
    }

    return cart;
  } catch (error) {
    console.error('Error creating cart:', error);
    throw error;
  }
}

/**
 * Get cart contents - Updated for current WooGraphQL schema
 */
export async function getCart() {
  try {
    interface CartResponse {
      cart: {
        contents: {
          nodes: Array<{
            key: string;
            product: {
              node: {
                id: string;
                databaseId: number;
                name: string;
                slug: string;
                type: string;
                image: {
                  sourceUrl: string;
                  altText: string;
                };
              };
            };
            quantity: number;
            total: string;
          }>;
        };
        subtotal: string;
        total: string;
        totalTax: string;
        isEmpty: boolean;
      };
    }
    
    const data = await wooGraphQLFetch<CartResponse>({
      query: GET_CART,
      variables: {} // Cart query doesn't need parameters in current WooGraphQL
    });
    
    return data?.cart || null;
  } catch (error) {
    console.error(`Error fetching cart:`, error);
    return null;
  }
}

/**
 * Add items to cart - Updated for current WooGraphQL schema
 */
export async function addToCart(_cartId: string, items: any[]) {
  try {
    interface AddToCartResponse {
      addToCart: {
        cart: {
          contents: {
            nodes: Array<{
              key: string;
              product: {
                node: {
                  id: string;
                  databaseId: number;
                  name: string;
                  slug: string;
                  type: string;
                  image: {
                    sourceUrl: string;
                    altText: string;
                  };
                };
              };
              quantity: number;
              total: string;
            }>;
          };
          subtotal: string;
          total: string;
          totalTax: string;
          isEmpty: boolean;
          contentsCount: number;
        };
      };
    }

    // WooCommerce GraphQL addToCart only accepts one item at a time
    // So we'll add the first item and return the cart
    if (items.length === 0) {
      throw new Error('No items provided to add to cart');
    }

    const item = items[0];
    const variables = {
      productId: parseInt(item.productId),
      quantity: item.quantity || 1,
      variationId: item.variationId ? parseInt(item.variationId) : null,
      extraData: null
    };

    console.log('Adding to cart with variables:', variables);

    const response = await wooGraphQLFetch<AddToCartResponse>({
      query: ADD_TO_CART,
      variables
    });

    console.log('Add to cart response:', response);
    return response.addToCart.cart;
  } catch (error) {
    console.error(`Error adding items to cart:`, error);
    throw error;
  }
}

/**
 * Remove items from cart - Updated for current WooGraphQL schema
 */
export async function removeFromCart(cartId: string, keys: string[]) {
  try {
    interface RemoveFromCartResponse {
      removeItemsFromCart: {
        cart: {
          contents: {
            nodes: Array<{
              key: string;
              product: {
                node: {
                  id: string;
                  databaseId: number;
                  name: string;
                  slug: string;
                  type: string;
                  image: {
                    sourceUrl: string;
                    altText: string;
                  };
                };
              };
              quantity: number;
              total: string;
            }>;
          };
          subtotal: string;
          total: string;
          totalTax: string;
          isEmpty: boolean;
        };
      };
    }
    
    const data = await wooGraphQLFetch<RemoveFromCartResponse>({
      query: MUTATION_REMOVE_FROM_CART,
      variables: { 
        keys,
        all: false
      }
    });
    
    return data?.removeItemsFromCart?.cart || null;
  } catch (error) {
    console.error(`Error removing items from cart:`, error);
    throw error;
  }
}

/**
 * Customer login with WooCommerce GraphQL
 * 
 * @param username User's email/username
 * @param password User's password
 * @returns Authentication token and user information
 */
export async function customerLogin(username: string, password: string) {
  try {
    const LOGIN_MUTATION = gql`
      mutation LoginUser($username: String!, $password: String!) {
        login(input: {
          clientMutationId: "login"
          username: $username
          password: $password
        }) {
          authToken
          refreshToken
          user {
            id
            databaseId
            email
            firstName
            lastName
            nicename
            nickname
            username
          }
        }
      }
    `;

    const variables = {
      username,
      password
    };

    const result = await wooGraphQLFetch<{
      login: {
        authToken: string;
        refreshToken: string;
        user: any;
      }
    }>({
      query: LOGIN_MUTATION,
      variables
    });

    if (!result || !result.login || !result.login.authToken) {
      throw new Error('Login failed: Invalid response from server');
    }

    // Set the auth token for future requests
    setAuthToken(result.login.authToken);

    return {
      authToken: result.login.authToken,
      refreshToken: result.login.refreshToken,
      user: result.login.user,
      customerUserErrors: []  // For compatibility with Shopify auth
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Format the error to match the expected structure
    return {
      authToken: null,
      refreshToken: null,
      user: null,
      customerUserErrors: [
        {
          code: 'LOGIN_FAILED',
          message: error.message || 'Login failed. Please check your credentials.'
        }
      ]
    };
  }
}

/**
 * Create customer (register) with WooCommerce GraphQL
 */
export async function createCustomer({
  email,
  password,
  firstName,
  lastName,
  phone,
  acceptsMarketing = false
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptsMarketing?: boolean;
}) {
  try {
    const REGISTER_MUTATION = gql`
      mutation RegisterUser($input: RegisterCustomerInput!) {
        registerCustomer(input: $input) {
          clientMutationId
          authToken
          refreshToken
          customer {
            id
            databaseId
            email
            firstName
            lastName
          }
        }
      }
    `;

    const variables = {
      input: {
        clientMutationId: "registerCustomer",
        email,
        password,
        firstName,
        lastName,
        username: email, // Use email as username by default
      }
    };

    const result = await wooGraphQLFetch<{
      registerCustomer: {
        authToken: string;
        refreshToken: string;
        customer: any;
      }
    }>({
      query: REGISTER_MUTATION,
      variables
    });

    if (!result || !result.registerCustomer) {
      throw new Error('Registration failed: Invalid response from server');
    }

    return {
      customer: result.registerCustomer.customer,
      authToken: result.registerCustomer.authToken,
      refreshToken: result.registerCustomer.refreshToken,
      customerUserErrors: []  // For compatibility with Shopify auth
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Format the error to match the expected structure
    return {
      customer: null,
      authToken: null,
      refreshToken: null,
      customerUserErrors: [
        {
          code: 'REGISTRATION_FAILED',
          message: error.message || 'Registration failed. Please try again.'
        }
      ]
    };
  }
}

/**
 * Get customer data using JWT authentication
 * 
 * @param token JWT auth token
 * @returns Customer data
 */
export async function getCustomer(token?: string) {
  try {
    if (token) {
      setAuthToken(token);
    }
    
    const GET_CUSTOMER_QUERY = gql`
      query GetCustomer {
        customer {
          id
          databaseId
          email
          firstName
          lastName
          displayName
          username
          role
          date
          modified
          isPayingCustomer
          orderCount
          totalSpent
          billing {
            firstName
            lastName
            company
            address1
            address2
            city
            state
            postcode
            country
            email
            phone
          }
          shipping {
            firstName
            lastName
            company
            address1
            address2
            city
            state
            postcode
            country
          }
          orders(first: 50) {
            nodes {
              id
              databaseId
              date
              status
              total
              subtotal
              totalTax
              shippingTotal
              discountTotal
              paymentMethodTitle
              customerNote
              billing {
                firstName
                lastName
                company
                address1
                address2
                city
                state
                postcode
                country
                email
                phone
              }
              shipping {
                firstName
                lastName
                company
                address1
                address2
                city
                state
                postcode
                country
              }
              lineItems {
                nodes {
                  product {
                    node {
                      id
                      name
                      slug
                      image {
                        sourceUrl
                        altText
                      }
                    }
                  }
                  variation {
                    node {
                      id
                      name
                      attributes {
                        nodes {
                          name
                          value
                        }
                      }
                    }
                  }
                  quantity
                  total
                  subtotal
                  totalTax
                }
              }
              shippingLines {
                nodes {
                  methodTitle
                  total
                }
              }
              feeLines {
                nodes {
                  name
                  total
                }
              }
              couponLines {
                nodes {
                  code
                  discount
                }
              }
            }
          }
          downloadableItems {
            nodes {
              name
              downloadId
              downloadsRemaining
              accessExpires
              product {
                node {
                  id
                  name
                }
              }
            }
          }
          metaData {
            key
            value
          }
        }
      }
    `;

    const result = await wooGraphQLFetch<{
      customer: any;
    }>({
      query: GET_CUSTOMER_QUERY
    });

    if (!result || !result.customer) {
      throw new Error('Failed to get customer data');
    }

    return result.customer;
  } catch (error: any) {
    console.error('Error getting customer data:', error);
    throw error;
  } finally {
    if (token) {
      clearAuthToken();
    }
  }
}

/**
 * Normalize product data to match the existing frontend structure
 * This helps maintain compatibility with the existing components
 */
export function normalizeProduct(product: any) {
  if (!product) return null;
  
  // Extract product type
  const isVariable = Boolean(product.variations?.nodes?.length);
  
  // Extract pricing data
  let priceRange = {
    minVariantPrice: {
      amount: product.price || "0",
      currencyCode: "INR" // Default currency for the application
    },
    maxVariantPrice: {
      amount: product.price || "0",
      currencyCode: "INR"
    }
  };
  
  // For variable products, calculate actual price range
  if (isVariable && product.variations?.nodes?.length > 0) {
    const prices = product.variations.nodes
      .map((variant: any) => parseFloat(variant.price || '0'))
      .filter((price: number) => !isNaN(price));
    
    if (prices.length > 0) {
      priceRange = {
        minVariantPrice: {
          amount: String(Math.min(...prices)),
          currencyCode: "INR"
        },
        maxVariantPrice: {
          amount: String(Math.max(...prices)),
          currencyCode: "INR"
        }
      };
    }
  }
  
  // Extract and normalize images
  const images = normalizeProductImages(product);
  
  // Extract variant data
  const variants = product.variations?.nodes?.map((variant: any) => ({
    id: variant.id,
    title: variant.name,
    price: {
      amount: variant.price || "0",
      currencyCode: "USD"
    },
    availableForSale: variant.stockStatus === 'IN_STOCK',
    selectedOptions: variant.attributes?.nodes?.map((attr: any) => ({
      name: attr.name,
      value: attr.value
    })) || [],
    sku: variant.sku || '',
    image: variant.image ? {
      url: variant.image.sourceUrl,
      altText: variant.image.altText || ''
    } : null
  })) || [];
  
  // Extract options data for variable products
  const options = product.attributes?.nodes?.map((attr: any) => ({
    name: attr.name,
    values: attr.options || []
  })) || [];
  
  // Extract category data
  const collections = product.productCategories?.nodes?.map((category: any) => ({
    handle: category.slug,
    title: category.name
  })) || [];
  
  // Extract meta fields for custom data
  const metafields: Record<string, any> = {};
  if (product.metafields) {
    product.metafields.forEach((meta: any) => {
      metafields[meta.key] = meta.value;
    });
  }
  
  // Return normalized product object that matches existing frontend structure
  return {
    id: product.id,
    handle: product.slug,
    title: product.name,
    description: product.description || '',
    descriptionHtml: product.description || '',
    priceRange,
    options,
    variants,
    images,
    collections,
    availableForSale: product.stockStatus !== 'OUT_OF_STOCK',
    metafields,
    // Add original data for reference if needed
    _originalWooProduct: product
  };
}

/**
 * Normalize product images array
 */
export function normalizeProductImages(product: any): Array<{url: string, altText?: string}> {
  const images = [];
  
  // Add main product image if available
  if (product.image) {
    images.push({
      url: product.image.sourceUrl,
      altText: product.image.altText || product.name || ''
    });
  }
  
  // Add gallery images if available
  if (product.galleryImages?.nodes?.length) {
    product.galleryImages.nodes.forEach((img: any) => {
      // Avoid duplicating the main image if it's already in the gallery
      const isMainImage = product.image && img.sourceUrl === product.image.sourceUrl;
      if (!isMainImage) {
        images.push({
          url: img.sourceUrl,
          altText: img.altText || product.name || ''
        });
      }
    });
  }
  
  return images;
}

/**
 * Normalize category data to match existing frontend structure
 */
export function normalizeCategory(category: any) {
  if (!category) return null;
  
  return {
    id: category.id,
    handle: category.slug,
    title: category.name,
    description: category.description || '',
    image: category.image ? {
      url: category.image.sourceUrl,
      altText: category.image.altText || ''
    } : null,
    products: category.products?.nodes?.map(normalizeProduct) || []
  };
}

/**
 * Get custom meta field from product
 */
export const getMetafield = (product: any, key: string, namespace?: string, defaultValue: string = ''): string => {
  if (!product || !product.metafields) return defaultValue;
  
  // Find the meta field by key
  if (namespace) {
    const metaKey = `${namespace}:${key}`;
    return product.metafields[metaKey] || defaultValue;
  }
  
  return product.metafields[key] || defaultValue;
};

/**
 * Normalize cart data to match existing frontend structure
 */
export function normalizeCart(cart: any) {
  if (!cart) return null;
  
  const lineItems = cart.contents?.nodes?.map((item: any) => {
    const product = item.product?.node;
    const variation = item.variation?.node;
    
    return {
      id: item.key,
      quantity: item.quantity,
      merchandise: {
        id: variation?.id || product?.id,
        title: variation?.name || product?.name,
        product: {
          id: product?.id,
          handle: product?.slug,
          title: product?.name,
          image: product?.image ? {
            url: product?.image.sourceUrl,
            altText: product?.image.altText || ''
          } : null
        },
        selectedOptions: variation?.attributes?.nodes?.map((attr: any) => ({
          name: attr.name,
          value: attr.value
        })) || []
      },
      cost: {
        totalAmount: {
          amount: item.total || "0",
          currencyCode: "USD"
        }
      }
    };
  }) || [];
  
  const discountCodes = cart.appliedCoupons?.nodes?.map((coupon: any) => ({
    code: coupon.code,
    amount: coupon.discountAmount || "0"
  })) || [];
  
  // Calculate total quantity from line items instead of using contentsCount
  const totalQuantity = lineItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
  
  return {
    id: cart.id,
    checkoutUrl: '', // WooCommerce doesn't have a direct checkout URL - this would be handled by your custom checkout
    totalQuantity: totalQuantity,
    cost: {
      subtotalAmount: {
        amount: cart.subtotal || "0",
        currencyCode: "USD"
      },
      totalAmount: {
        amount: cart.total || "0",
        currencyCode: "USD"
      }
    },
    lines: lineItems,
    discountCodes
  };
}

/**
 * Generates a checkout URL for WooCommerce
 * 
 * @param cartId The cart ID to associate with checkout
 * @param isLoggedIn Whether the user is logged in
 * @returns The WooCommerce checkout URL
 */
export function getWooCommerceCheckoutUrl(cartId: string, isLoggedIn: boolean = false): string {
  // Base checkout URL
  const baseUrl = `${wooConfig.storeUrl}/checkout`;
  
  // Add cart parameter if needed
  const cartParam = cartId ? `?cart=${cartId}` : '';
  
  // Add comprehensive guest checkout parameters to ensure login is bypassed
  // These parameters will work across different WooCommerce configurations and plugins
  let guestParams = '';
  if (!isLoggedIn) {
    const separator = cartParam ? '&' : '?';
    guestParams = `${separator}guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0&skip_login=1&force_guest_checkout=1`;
  }
  
  // Construct the full URL
  return `${baseUrl}${cartParam}${guestParams}`;
}

/**
 * Get a product by its ID
 * @param id The product ID
 * @param revalidate Revalidation time in seconds
 * @returns The product data or a fallback product if not found
 */
export async function getProductById(id: string, revalidate = 60) {
  try {
    // Check if ID is in a valid format
    if (!id || id === 'undefined' || id === 'null') {
      console.warn(`Invalid product ID format: ${id}, returning fallback product`);
      return createFallbackProduct(id);
    }
    
    // Validate and transform the product ID
    const validatedId = await validateProductId(id);
    
    // Define cache tags for this product
    const tags = [`product-${validatedId}`, 'products', 'inventory'];
    
    // Define the query
    const QUERY_PRODUCT_BY_ID = gql`
      query GetProductById($id: ID!) {
        product(id: $id, idType: DATABASE_ID) {
          id
          databaseId
          name
          slug
          description
          shortDescription
          productCategories {
            nodes {
              id
              name
              slug
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
            variations {
              nodes {
                stockStatus
                stockQuantity
              }
            }
          }
          image {
            id
            sourceUrl
            altText
          }
        }
      }
    `;

    try {
      // Fetch the product with tags
      const data = await fetchFromWooCommerce(
        QUERY_PRODUCT_BY_ID, 
        { id: validatedId }, 
        tags, 
        revalidate
      );
      
      // Check if product exists
      if (!data?.product) {
        console.warn(`No product found with ID: ${id}, returning fallback product`);
        return createFallbackProduct(id);
      }
      
      return data.product;
    } catch (error) {
      console.error(`Error fetching product with ID ${id}:`, error);
      // Return a fallback product instead of throwing an error
      return createFallbackProduct(id);
    }
  } catch (error) {
    console.error(`Error in getProductById for ID ${id}:`, error);
    // Return a fallback product instead of throwing an error
    return createFallbackProduct(id);
  }
}

/**
 * Create a fallback product for when a product cannot be found
 * @param id The original product ID
 * @returns A fallback product object
 */
function createFallbackProduct(id: string) {
  return {
    id: id,
    databaseId: 0,
    name: "Product Not Found",
    slug: "product-not-found",
    description: "This product is no longer available.",
    shortDescription: "Product not found",
    price: "0.00",
    regularPrice: "0.00",
    salePrice: null,
    onSale: false,
    stockStatus: "OUT_OF_STOCK",
    stockQuantity: 0,
    image: {
      id: null,
      sourceUrl: "/placeholder-product.jpg",
      altText: "Product not found"
    },
    productCategories: {
      nodes: []
    }
  };
}

/**
 * Search products by keyword with advanced options
 * @param query Search query
 * @param options Search options including pagination, sorting, filtering
 * @returns Products matching the search query
 */
export async function searchProducts(
  query: string, 
  options: {
    first?: number;
    after?: string;
    orderby?: string;
    order?: string;
    type?: string[];
    tag_slug?: string[];
    stock_status?: string;
  } | number = {}
) {
  // Handle case where options is passed as a number for backward compatibility
  const first = typeof options === 'number' ? options : (options.first || 10);
  const searchQuery = gql`
    query SearchProducts($query: String!, $first: Int) {
      products(first: $first, where: { search: $query }) {
        nodes {
          id
          databaseId
          name
          slug
          price
          image {
            sourceUrl
            altText
          }
          shortDescription
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  try {
    interface SearchResponse {
      products: {
        nodes: any[];
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }
    
    const data = await graphQLClient.request<SearchResponse>(searchQuery, {
      query,
      first
    });

    return data?.products || { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
  } catch (error) {
    console.error('Error searching products:', error);
    return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }
}

/**
 * Get a single product by ID
 * @param id Product ID
 * @returns Product data
 */
export async function getProduct(id: number | string) {
  const productQuery = gql`
    query GetProduct($id: ID!) {
      product(id: $id, idType: DATABASE_ID) {
        id
        databaseId
        name
        slug
        description
        shortDescription
        price
        regularPrice
        salePrice
        onSale
        stockStatus
        stockQuantity
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
          attributes {
            nodes {
              name
              options
            }
          }
          price
          regularPrice
          salePrice
        }
        ... on VariableProduct {
          price
          regularPrice
          salePrice
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
              attributes {
                nodes {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphQLClient.request<{ product: any }>(productQuery, { id });
    return data.product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw new Error('Failed to fetch product');
  }
}

export async function getCategoryProducts(
  slug: string,
  options: {
    first?: number;
    after?: string;
    orderby?: string;
    order?: string;
    filters?: any;
  } = {}
) {
  try {
    const { first = 20 } = options;

    const data = await graphQLClient.request<{ productCategory: any }>(
      QUERY_CATEGORY_PRODUCTS,
      { slug, first }
    );

    return data?.productCategory || null;
  } catch (error) {
    console.error(`Error fetching category products with slug ${slug}:`, error);
    return null;
  }
}

/**
 * Get products by category - alias for getCategoryProducts for compatibility
 */
export async function getProductsByCategory(
  categorySlug: string,
  options: {
    limit?: number;
    page?: number;
    sort?: string;
  } = {}
) {
  const { limit = 20, page = 1, sort = 'DATE' } = options;
  const after = page > 1 ? btoa(`arrayconnection:${(page - 1) * limit - 1}`) : undefined;

  return getCategoryProducts(categorySlug, {
    first: limit,
    after,
    orderby: sort,
    order: 'DESC'
  });
}

/**
 * Get products by tag
 */
export async function getProductsByTag(
  tagSlug: string,
  options: {
    limit?: number;
    page?: number;
    sort?: string;
  } = {}
) {
  const { limit = 20, page = 1, sort = 'DATE' } = options;

  // For now, return empty result as tag functionality needs proper GraphQL query
  // This prevents build errors while maintaining API compatibility
  console.warn(`getProductsByTag called with tag: ${tagSlug} - functionality not yet implemented`);

  return {
    tag: { id: '', name: tagSlug, slug: tagSlug, description: '' },
    products: [],
    pageInfo: { hasNextPage: false, endCursor: null }
  };
}

// Customer Mutations
const CREATE_CUSTOMER_MUTATION = gql`
  mutation CreateCustomer($input: RegisterCustomerInput!) {
    registerCustomer(input: $input) {
      customer {
        id
        databaseId
        email
        firstName
        lastName
        displayName
      }
      authToken
      refreshToken
    }
  }
`;

const UPDATE_CUSTOMER_MUTATION = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      clientMutationId
      customer {
        id
        databaseId
        email
        firstName
        lastName
        displayName
        billing {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
          email
          phone
        }
        shipping {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
        }
      }
      customerUserErrors {
        field
        message
      }
    }
  }
`;

const GET_CUSTOMER_QUERY = gql`
  query GetCustomer {
    customer {
      id
      databaseId
      email
      firstName
      lastName
      displayName
      username
      role
      date
      modified
      isPayingCustomer
      orderCount
      totalSpent
      billing {
        firstName
        lastName
        company
        address1
        address2
        city
        state
        postcode
        country
        email
        phone
      }
      shipping {
        firstName
        lastName
        company
        address1
        address2
        city
        state
        postcode
        country
      }
      orders(first: 50) {
        nodes {
          id
          databaseId
          date
          status
          total
          subtotal
          totalTax
          shippingTotal
          discountTotal
          paymentMethodTitle
          customerNote
          billing {
            firstName
            lastName
            company
            address1
            address2
            city
            state
            postcode
            country
            email
            phone
          }
          shipping {
            firstName
            lastName
            company
            address1
            address2
            city
            state
            postcode
            country
          }
          lineItems {
            nodes {
              product {
                node {
                  id
                  name
                  slug
                  image {
                    sourceUrl
                    altText
                  }
                }
              }
              variation {
                node {
                  id
                  name
                  attributes {
                    nodes {
                      name
                      value
                    }
                  }
                }
              }
              quantity
              total
              subtotal
              totalTax
            }
          }
          shippingLines {
            nodes {
              methodTitle
              total
            }
          }
          feeLines {
            nodes {
              name
              total
            }
          }
          couponLines {
            nodes {
              code
              discount
            }
          }
        }
      }
      downloadableItems {
        nodes {
          name
          downloadId
          downloadsRemaining
          accessExpires
          product {
            node {
              id
              name
            }
          }
        }
      }
      metaData {
        key
        value
      }
    }
  }
`;

const CREATE_ADDRESS_MUTATION = gql`
  mutation CreateAddress($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      customer {
        id
        billing {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
          email
          phone
        }
        shipping {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
        }
      }
    }
  }
`;

const UPDATE_ADDRESS_MUTATION = gql`
  mutation UpdateAddress($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      customer {
        id
        billing {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
          email
          phone
        }
        shipping {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
        }
      }
    }
  }
`;

const DELETE_ADDRESS_MUTATION = gql`
  mutation DeleteAddress($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      customer {
        id
        billing {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
          email
          phone
        }
        shipping {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
        }
      }
    }
  }
`;

const SET_DEFAULT_ADDRESS_MUTATION = gql`
  mutation SetDefaultAddress($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      customer {
        id
        billing {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
          email
          phone
        }
        shipping {
          firstName
          lastName
          company
          address1
          address2
          city
          state
          postcode
          country
        }
      }
    }
  }
`;

const UPDATE_CART_MUTATION = gql`
  mutation UpdateCart($input: UpdateItemQuantitiesInput!) {
    updateItemQuantities(input: $input) {
      cart {
        contents {
          nodes {
            key
            product {
              node {
                id
                name
                price
              }
            }
            quantity
            total
          }
        }
        subtotal
        total
        totalTax
        isEmpty
      }
    }
  }
`;

/**
 * Update customer profile
 */
export async function updateCustomer(token: string, customerData: any) {
  try {
    console.log('Updating customer with data:', customerData);
    console.log('Using token:', token ? 'Token present' : 'No token');

    // Create a new client with the auth token
    const client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const variables = {
      input: {
        clientMutationId: "updateCustomer",
        ...customerData
      }
    };

    console.log('GraphQL variables:', variables);

    const response = await client.request<{
      updateCustomer: {
        customer: any;
        customerUserErrors?: Array<{
          field: string[];
          message: string;
        }>;
      }
    }>(UPDATE_CUSTOMER_MUTATION, variables);

    console.log('GraphQL response:', response);

    if (response.updateCustomer.customerUserErrors && response.updateCustomer.customerUserErrors.length > 0) {
      const errorMessage = response.updateCustomer.customerUserErrors[0].message;
      console.error('Customer update error:', errorMessage);
      throw new Error(errorMessage);
    }

    return response.updateCustomer;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}

/**
 * Create a new address for the customer
 */
export async function createAddress(token: string, address: any) {
  try {
    // Create a new client with the auth token
    const client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    // Determine if this is a billing or shipping address
    const addressType = address.addressType || 'shipping';
    
    const variables = {
      input: {
        [`${addressType}`]: {
          firstName: address.firstName || '',
          lastName: address.lastName || '',
          company: address.company || '',
          address1: address.address1 || '',
          address2: address.address2 || '',
          city: address.city || '',
          state: address.province || '',
          postcode: address.zip || '',
          country: address.country || '',
          ...(addressType === 'billing' ? {
            email: address.email || '',
            phone: address.phone || ''
          } : {})
        }
      }
    };

    const response = await client.request<{
      updateCustomer: {
        customer: any;
      }
    }>(CREATE_ADDRESS_MUTATION, variables);

    return {
      customerAddress: response.updateCustomer.customer[addressType],
      customerUserErrors: []
    };
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
}

/**
 * Update an existing address
 */
export async function updateAddress(token: string, id: string, address: any) {
  try {
    // Create a new client with the auth token
    const client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    // Determine if this is a billing or shipping address
    const addressType = address.addressType || 'shipping';
    
    const variables = {
      input: {
        [`${addressType}`]: {
          firstName: address.firstName || '',
          lastName: address.lastName || '',
          company: address.company || '',
          address1: address.address1 || '',
          address2: address.address2 || '',
          city: address.city || '',
          state: address.province || '',
          postcode: address.zip || '',
          country: address.country || '',
          ...(addressType === 'billing' ? {
            email: address.email || '',
            phone: address.phone || ''
          } : {})
        }
      }
    };

    const response = await client.request<{
      updateCustomer: {
        customer: any;
      }
    }>(UPDATE_ADDRESS_MUTATION, variables);

    return {
      customerAddress: response.updateCustomer.customer[addressType],
      customerUserErrors: []
    };
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
}

/**
 * Delete an address
 * Note: In WooCommerce, we don't actually delete addresses but clear them
 */
export async function deleteAddress(token: string, id: string) {
  try {
    // Create a new client with the auth token
    const client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    // Get the current customer to determine which address to clear
    const customer = await getCustomer(token);
    
    // Determine if this is a billing or shipping address
    // In this implementation, we're using the id to determine which address to clear
    // This is a simplification - you might need a different approach
    const addressType = id === 'billing' ? 'billing' : 'shipping';
    
    const variables = {
      input: {
        [`${addressType}`]: {
          firstName: '',
          lastName: '',
          company: '',
          address1: '',
          address2: '',
          city: '',
          state: '',
          postcode: '',
          country: '',
          ...(addressType === 'billing' ? {
            email: customer.email || '',
            phone: ''
          } : {})
        }
      }
    };

    const response = await client.request<{
      updateCustomer: {
        customer: any;
      }
    }>(DELETE_ADDRESS_MUTATION, variables);

    return {
      deletedCustomerAddressId: id,
      customerUserErrors: []
    };
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
}

/**
 * Set default address
 * Note: In WooCommerce, the concept of "default" address is different
 * This implementation copies the address from one type to another
 */
export async function setDefaultAddress(token: string, addressId: string) {
  try {
    // Create a new client with the auth token
    const client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    // Get the current customer
    const customer = await getCustomer(token);
    
    // Determine source and target address types
    // This is a simplification - you might need a different approach
    const sourceType = addressId === 'billing' ? 'billing' : 'shipping';
    const targetType = sourceType === 'billing' ? 'shipping' : 'billing';
    
    // Copy the address from source to target
    const sourceAddress = customer[sourceType];
    
    const variables = {
      input: {
        [`${targetType}`]: {
          ...sourceAddress,
          ...(targetType === 'billing' ? {
            email: customer.email || '',
            phone: sourceAddress.phone || ''
          } : {})
        }
      }
    };

    const response = await client.request<{
      updateCustomer: {
        customer: any;
      }
    }>(SET_DEFAULT_ADDRESS_MUTATION, variables);

    return {
      customer: response.updateCustomer.customer,
      customerUserErrors: []
    };
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
}

/**
 * Update cart items
 */
export async function updateCart(items: Array<{key: string, quantity: number}>) {
  try {
    const variables = {
      input: {
        items
      }
    };

    const response = await wooGraphQLFetch<{
      updateItemQuantities: {
        cart: any;
      }
    }>({
      query: UPDATE_CART_MUTATION,
      variables
    });

    return response.updateItemQuantities.cart;
  } catch (error) {
    console.error('Error updating cart:', error);
    throw error;
  }
}
