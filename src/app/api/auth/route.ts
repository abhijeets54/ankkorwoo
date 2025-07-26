import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';
import { jwtDecode } from 'jwt-decode';

// Auth token cookie name
const AUTH_COOKIE_NAME = 'woo_auth_token';
const REFRESH_COOKIE_NAME = 'woo_refresh_token';

// GraphQL endpoint
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';
const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// Make sure the URL has https:// prefix
if (endpoint && !endpoint.startsWith('http')) {
  console.warn('GraphQL endpoint URL does not start with http(s)://, adding https:// prefix');
  graphQLClient.setEndpoint(`https://${endpoint}`);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'login':
        return handleLogin(data);
      case 'register':
        return handleRegister(data);
      case 'logout':
        return handleLogout();
      case 'refresh':
        return handleRefreshToken(data);
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

async function handleLogin({ username, password }: { username: string; password: string }) {
  try {
    console.log(`Attempting login for user: ${username}`);
    console.log(`Using GraphQL endpoint: ${endpoint}`);
    
    // GraphQL request to login
    const data = await graphQLClient.request<{
      login: {
        authToken: string;
        refreshToken?: string;
        user: any;
      }
    }>(LOGIN_MUTATION, {
      username,
      password,
    });
    
    console.log('Login response received:', JSON.stringify(data, null, 2));
    
    if (!data || !data.login || !data.login.authToken) {
      console.error('Login failed: No auth token returned');
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Set auth tokens as HTTP-only cookies
    const cookieStore = cookies();
    
    // Configure cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    };
    
    // Set auth token cookie
    cookieStore.set(AUTH_COOKIE_NAME, data.login.authToken, cookieOptions);
    
    // Set refresh token cookie if available
    if (data.login.refreshToken) {
      cookieStore.set(REFRESH_COOKIE_NAME, data.login.refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
    
    console.log('Login successful, cookies set for user:', data.login.user.email);
    
    // Create response with user data and token for frontend use
    const response = NextResponse.json({
      success: true,
      user: {
        id: data.login.user.id,
        email: data.login.user.email,
        firstName: data.login.user.firstName,
        lastName: data.login.user.lastName,
      },
      token: data.login.authToken // Include token for frontend access
    });
    
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Check for specific GraphQL errors
    if (error.response?.errors) {
      const graphqlErrors = error.response.errors;
      console.error('GraphQL errors:', graphqlErrors);
      
      // Check for specific error messages
      const errorMessage = graphqlErrors[0]?.message || 'Login failed';
      if (errorMessage.includes('Invalid username') || errorMessage.includes('incorrect password')) {
        return NextResponse.json(
          { success: false, message: 'Invalid username or password' },
          { status: 401 }
        );
      }
      
      // Return first error message
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage
        },
        { status: 401 }
      );
    }
    
    // Network or other errors
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Login failed. Please check your connection and try again.' 
      },
      { status: 500 }
    );
  }
}

async function handleRegister(userData: any) {
  try {
    const { email, firstName, lastName, password } = userData;
    
    // Prepare input data for registration
    const input = {
      clientMutationId: "registerCustomer",
      email,
      firstName,
      lastName,
      password,
      username: email,
    };
    
    const data = await graphQLClient.request<{
      registerCustomer?: {
        authToken: string;
        refreshToken?: string;
        customer: any;
      }
    }>(REGISTER_MUTATION, {
      input,
    });
    
    if (!data.registerCustomer || !data.registerCustomer.authToken) {
      return NextResponse.json(
        { success: false, message: 'Registration failed' },
        { status: 400 }
      );
    }
    
    // Set auth tokens as HTTP-only cookies
    const cookieStore = cookies();
    
    // Configure cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    };
    
    // Set auth token cookie
    cookieStore.set(AUTH_COOKIE_NAME, data.registerCustomer.authToken, cookieOptions);
    
    // Set refresh token cookie if available
    if (data.registerCustomer.refreshToken) {
      cookieStore.set(REFRESH_COOKIE_NAME, data.registerCustomer.refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
    
    console.log('Registration successful, cookies set for user:', email);
    
    // Include token in response for frontend use
    return NextResponse.json({
      success: true,
      customer: data.registerCustomer.customer,
      token: data.registerCustomer.authToken
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Check for specific GraphQL errors
    if (error.response?.errors) {
      const graphqlErrors = error.response.errors;
      console.error('GraphQL errors:', graphqlErrors);
      
      // Return first error message
      return NextResponse.json(
        { 
          success: false, 
          message: graphqlErrors[0]?.message || 'Registration failed'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

async function handleLogout() {
  // Clear auth cookies
  const cookieStore = cookies();
  
  // Delete auth token cookie
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    expires: new Date(0),
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  });
  
  // Delete refresh token cookie
  cookieStore.set(REFRESH_COOKIE_NAME, '', {
    expires: new Date(0),
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  });
  
  console.log('Logout: Auth cookies cleared');
  
  return NextResponse.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
}

async function handleRefreshToken({ refreshToken }: { refreshToken?: string }) {
  try {
    // If no token provided, try to get from cookies
    const cookieStore = cookies();
    const tokenFromCookie = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
    const token = refreshToken || tokenFromCookie;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No refresh token provided' },
        { status: 400 }
      );
    }
    
    // Request a new auth token using the refresh token
    const data = await graphQLClient.request<{
      refreshJwtAuthToken: {
        authToken: string;
      }
    }>(REFRESH_TOKEN_MUTATION, {
      input: {
        clientMutationId: "refreshToken",
        jwtRefreshToken: token,
      },
    });
    
    if (!data.refreshJwtAuthToken || !data.refreshJwtAuthToken.authToken) {
      return NextResponse.json(
        { success: false, message: 'Failed to refresh token' },
        { status: 400 }
      );
    }
    
    const newAuthToken = data.refreshJwtAuthToken.authToken;
    
    // Set the new auth token as an HTTP-only cookie
    cookieStore.set(AUTH_COOKIE_NAME, newAuthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    // Try to extract user information from token
    let userId = 'unknown';
    try {
      const decodedToken = jwtDecode<any>(newAuthToken);
      userId = decodedToken.data?.user?.id || 'unknown';
    } catch (decodeError) {
      console.error('Error decoding JWT token:', decodeError);
    }
    
    console.log('Token refreshed successfully for user ID:', userId);
    
    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    // Check for specific GraphQL errors
    if (error.response?.errors) {
      const graphqlErrors = error.response.errors;
      console.error('GraphQL errors:', graphqlErrors);
      
      // If the refresh token is invalid, clear the cookies
      const cookieStore = cookies();
      cookieStore.delete(AUTH_COOKIE_NAME);
      cookieStore.delete(REFRESH_COOKIE_NAME);
      
      return NextResponse.json(
        { 
          success: false, 
          message: graphqlErrors[0]?.message || 'Token refresh failed'
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: error.message || 'Token refresh failed' },
      { status: 500 }
    );
  }
} 