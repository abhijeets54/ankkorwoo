/**
 * Script to verify JWT Authentication configuration for WooCommerce
 * 
 * This script tests the JWT authentication setup by:
 * 1. Attempting a direct GraphQL login request
 * 2. Verifying the response contains the expected JWT tokens
 * 3. Using the token to make an authenticated request
 * 
 * Usage: node scripts/verify-jwt-auth.mjs
 */

import { config } from 'dotenv';
import { GraphQLClient, gql } from 'graphql-request';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Configuration
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL;
const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
const testPassword = process.env.TEST_USER_PASSWORD || 'password';

// Ensure endpoint has https:// prefix
const formattedEndpoint = endpoint && !endpoint.startsWith('http') 
  ? `https://${endpoint}` 
  : endpoint;

console.log(`🔍 Testing JWT Authentication at: ${formattedEndpoint}`);
console.log(`👤 Using test account: ${testEmail}`);

// GraphQL client
const client = new GraphQLClient(formattedEndpoint, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// Login mutation
const LOGIN_MUTATION = gql`
  mutation LoginUser($username: String!, $password: String!) {
    login(input: {
      clientMutationId: "login_test"
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

// Test query that requires authentication
const ME_QUERY = gql`
  query GetCustomer {
    customer {
      id
      databaseId
      email
    }
  }
`;

async function verifyJwtAuth() {
  try {
    console.log('🔐 Step 1: Testing login mutation...');
    
    const loginResponse = await client.request(LOGIN_MUTATION, {
      username: testEmail,
      password: testPassword,
    });
    
    if (!loginResponse.login || !loginResponse.login.authToken) {
      console.error('❌ Login failed: No auth token returned');
      console.error('Response:', JSON.stringify(loginResponse, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Login successful!');
    console.log('🔑 Auth token received');
    
    if (loginResponse.login.refreshToken) {
      console.log('🔄 Refresh token received');
    } else {
      console.warn('⚠️ No refresh token received - JWT refresh may not be configured');
    }
    
    console.log('👤 User info received:', {
      id: loginResponse.login.user.id,
      email: loginResponse.login.user.email,
      name: `${loginResponse.login.user.firstName} ${loginResponse.login.user.lastName}`.trim(),
    });
    
    // Test authenticated request
    console.log('\n🔐 Step 2: Testing authenticated request...');
    
    // Set auth token
    client.setHeader('Authorization', `Bearer ${loginResponse.login.authToken}`);
    
    const meResponse = await client.request(ME_QUERY);
    
    if (!meResponse.customer) {
      console.error('❌ Authentication failed: No customer data returned');
      console.error('Response:', JSON.stringify(meResponse, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Authentication successful!');
    console.log('👤 Customer data:', {
      id: meResponse.customer.id,
      email: meResponse.customer.email,
    });
    
    console.log('\n✅ JWT Authentication is properly configured!');
    
  } catch (error) {
    console.error('❌ JWT Authentication verification failed:');
    
    if (error.response?.errors) {
      console.error('GraphQL errors:', error.response.errors);
    } else {
      console.error(error);
    }
    
    // Provide troubleshooting steps
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Ensure WPGraphQL plugin is activated');
    console.log('2. Ensure WPGraphQL JWT Authentication plugin is activated');
    console.log('3. Check wp-config.php has the GRAPHQL_JWT_AUTH_SECRET_KEY defined');
    console.log('4. Verify the test user credentials are correct');
    console.log('5. Check server logs for more details');
    
    process.exit(1);
  }
}

verifyJwtAuth(); 