import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid token format' },
        { status: 401 }
      );
    }
    
    try {
      // Verify token expiration
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized: Token expired' },
          { status: 401 }
        );
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid token' },
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
        { success: false, message: 'Unauthorized: Invalid user' },
        { status: 401 }
      );
    }
    
    // Return the user data
    return NextResponse.json({
      success: true,
      user: response.customer
    });
  } catch (error) {
    console.error('Auth API error:', error);
    
    return NextResponse.json(
      { success: false, message: 'Server error during authentication' },
      { status: 500 }
    );
  }
} 