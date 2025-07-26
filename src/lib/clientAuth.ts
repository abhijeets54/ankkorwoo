/**
 * Client-side authentication module that works with the WooCommerce authentication API
 */

import { gql } from 'graphql-request';
import { jwtDecode } from 'jwt-decode';
import { GraphQLClient } from 'graphql-request';

// Auth token cookie name
const AUTH_COOKIE_NAME = 'woo_auth_token';
const REFRESH_COOKIE_NAME = 'woo_refresh_token';

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

// Customer response interface
export interface CustomerData {
  id: string;
  databaseId: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  billing?: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping?: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  orders?: {
    nodes: Array<{
      id: string;
      databaseId: number;
      date: string;
      status: string;
      total: string;
      lineItems: {
        nodes: Array<{
          product: {
            node: {
              id: string;
              name: string;
            };
          };
          quantity: number;
          total: string;
        }>;
      };
    }>;
  };
}

// Login mutation
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
      }
    }
  }
`;

// Register mutation
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

// Refresh token mutation
const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshAuthToken($input: RefreshJwtAuthTokenInput!) {
    refreshJwtAuthToken(input: $input) {
      authToken
    }
  }
`;

// Get customer query
const GET_CUSTOMER_QUERY = gql`
  query GetCustomer {
    customer {
      id
      databaseId
      email
      firstName
      lastName
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
      orders {
        nodes {
          id
          databaseId
          date
          status
          total
          lineItems {
            nodes {
              product {
                node {
                  id
                  name
                }
              }
              quantity
              total
            }
          }
        }
      }
    }
  }
`;

// Update customer mutation
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
    }
  }
`;

const endpoint = process.env.NEXT_PUBLIC_WOOCOMMERCE_GRAPHQL_URL || process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';
// Make sure the URL has https:// prefix
const formattedEndpoint = endpoint && !endpoint.startsWith('http') ? `https://${endpoint}` : endpoint;
const graphQLClient = new GraphQLClient(formattedEndpoint, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface WooUser {
  id: string;
  databaseId: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
}

// Client-side cookie utilities
function setCookie(name: string, value: string, days = 30) {
  // Use SameSite=Lax for better security while allowing normal navigation
  // Secure flag should only be used in production (HTTPS)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = `${name}=${value}${expires}; path=/; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

/**
 * Login user with username/email and password
 */
export async function login(username: string, password: string) {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'login',
        username,
        password,
      }),
      credentials: 'include', // Important: include cookies
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    const data = await response.json();
    
    // Update auth state based on response success
    if (data.success && data.user) {
      // Store login time for session tracking
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_session_started', Date.now().toString());
      }
      
      console.log('Login successful, user data received');
      return {
        success: true,
        user: data.user,
        token: data.token // Include token from API response
      };
    } else {
      console.error('Login response missing user data');
      throw new Error('Login failed: Invalid response from server');
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return { 
      success: false, 
      message: error.message || 'Login failed'
    };
  }
}

/**
 * Register a new user
 */
export async function register(
  email: string,
  firstName: string,
  lastName: string,
  password: string
) {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register',
        email,
        firstName,
        lastName,
        password,
      }),
      credentials: 'include', // Important: include cookies
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
    
    const data = await response.json();
    
    // Check for success and customer data
    if (data.success && data.customer) {
      // Store login time for session tracking
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_session_started', Date.now().toString());
      }
      
      console.log('Registration successful, user data received');
      return {
        success: true,
        customer: data.customer,
        token: data.token // Include token from API response
      };
    } else {
      console.error('Registration response missing customer data');
      throw new Error('Registration failed: Invalid response from server');
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    return { 
      success: false, 
      message: error.message || 'Registration failed'
    };
  }
}

/**
 * Logout the current user
 */
export async function logout() {
  try {
    // Make server request to clear cookies
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'logout',
      }),
      credentials: 'include', // Important: include cookies
    });
    
    // Clear any client-side storage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_session_started');
    }
    
    // Delete cookies client-side as well
    deleteCookie(AUTH_COOKIE_NAME);
    deleteCookie(REFRESH_COOKIE_NAME);
    
    console.log('Logout successful, session cleared');
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear local storage and cookies even if server request fails
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_session_started');
    }
    
    deleteCookie(AUTH_COOKIE_NAME);
    deleteCookie(REFRESH_COOKIE_NAME);
    
    return { success: true }; // Return success even if API call fails
  }
}

/**
 * Check if the user is authenticated
 */
export async function checkAuth() {
  try {
    const token = getAuthToken();
    
    if (!token) {
      return false;
    }
    
    // Check if token is expired
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        // Token is expired, try to refresh
        const refreshed = await refreshToken();
        return refreshed.success;
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      return false;
    }
    
    // Construct absolute URL for API request
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Verify token with server
    const response = await fetch(`${baseUrl}/api/auth/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include credentials (cookies)
    });
    
    if (!response.ok) {
      console.log('Auth check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

/**
 * Refresh authentication token
 */
export async function refreshToken() {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'refresh',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Token refresh failed');
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return { success: false, message: error.message || 'Token refresh failed' };
  }
}

/**
 * Get current user data
 */
export async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 401) {
      return null;
    }
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Get current customer data
 */
export async function getCurrentCustomer() {
  const token = getCookie(AUTH_COOKIE_NAME);
  
  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }
  
  try {
    // Set auth header
    const client = new GraphQLClient(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const data = await client.request<any>(GET_CUSTOMER_QUERY);
    
    if (!data.customer) {
      throw new Error('Failed to fetch customer data');
    }
    
    return {
      success: true,
      customer: normalizeCustomer(data.customer),
    };
  } catch (error: any) {
    console.error('Get customer error:', error);
    
    // If token expired, try to refresh
    if (error.message?.includes('jwt expired')) {
      const refreshed = await refreshToken();
      if (refreshed.success) {
        return getCurrentCustomer();
      }
    }
    
    return { success: false, message: error.message || 'Failed to fetch customer data' };
  }
}

/**
 * Update customer data
 */
export async function updateCustomer(customerData: Partial<CustomerData>) {
  const token = getCookie(AUTH_COOKIE_NAME);

  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    // Set auth header
    const client = new GraphQLClient(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Prepare input data
    const input = {
      clientMutationId: "updateCustomer",
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      billing: customerData.billing,
      shipping: customerData.shipping,
    };

    const data = await client.request<any>(UPDATE_CUSTOMER_MUTATION, { input });

    if (!data.updateCustomer || !data.updateCustomer.customer) {
      throw new Error('Failed to update customer data');
    }

    return {
      success: true,
      customer: data.updateCustomer.customer,
    };
  } catch (error: any) {
    console.error('Update customer error:', error);
    throw new Error(error.message || 'Failed to update customer data');
  }
}

/**
 * Get auth token from cookies
 */
export function getAuthToken(): string | null {
  return getCookie(AUTH_COOKIE_NAME);
}

/**
 * Get refresh token from cookies
 */
export function getRefreshToken(): string | null {
  return getCookie(REFRESH_COOKIE_NAME);
}

/**
 * Normalize customer data
 */
function normalizeCustomer(customer: any): CustomerData {
  return {
    id: customer.id || '',
    databaseId: customer.databaseId || 0,
    email: customer.email || '',
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    displayName: customer.displayName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    billing: customer.billing || null,
    shipping: customer.shipping || null,
    orders: customer.orders || null,
  };
} 