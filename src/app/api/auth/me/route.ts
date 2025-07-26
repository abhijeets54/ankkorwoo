import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GraphQLClient } from 'graphql-request';
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

// Customer response interface
interface CustomerResponse {
  customer: {
    id: string;
    databaseId: number;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

// Customer query
const GET_CUSTOMER_QUERY = `
  query GetCustomer {
    customer {
      id
      databaseId
      email
      firstName
      lastName
    }
  }
`;

const AUTH_COOKIE_NAME = 'woo_auth_token';

export async function GET() {
  try {
    // Get the auth token from HTTP-only cookies
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    try {
      // Verify token expiration
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        return NextResponse.json(
          { success: false, message: 'Token expired' },
          { status: 401 }
        );
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Create GraphQL client with the token
    const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || '';
    const graphQLClient = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    // Fetch customer data to verify the token is valid
    const response = await graphQLClient.request<CustomerResponse>(GET_CUSTOMER_QUERY);
    
    if (!response.customer) {
      return NextResponse.json(
        { success: false, message: 'Invalid user' },
        { status: 401 }
      );
    }
    
    // Return the user data along with the token for frontend use
    return NextResponse.json({
      success: true,
      customer: response.customer,
      isAuthenticated: true,
      token: token // Include the token in the response for frontend access
    });
  } catch (error) {
    console.error('Auth me API error:', error);
    
    return NextResponse.json(
      { success: false, message: 'Server error during authentication' },
      { status: 500 }
    );
  }
}
