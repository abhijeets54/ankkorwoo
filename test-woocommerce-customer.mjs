import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const graphQLClient = new GraphQLClient(process.env.WOOCOMMERCE_GRAPHQL_URL || '', {
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🔧 Testing WooCommerce Customer Queries');
console.log('=====================================\n');

async function testCustomerQuery() {
  try {
    console.log('Testing customer query by email...');
    
    const customerQuery = gql`
      query GetCustomer($id: ID!) {
        customer(id: $id, idType: EMAIL) {
          id
          email
          firstName
          lastName
          username
        }
      }
    `;
    
    const result = await graphQLClient.request(customerQuery, {
      id: 'as9184635@gmail.com',
    });
    
    console.log('✅ Customer Query Response:', JSON.stringify(result, null, 2));
    return result.customer;
    
  } catch (error) {
    console.error('❌ Customer Query Error:', error.response?.errors || error.message);
  }
}

async function testUserVsCustomer() {
  console.log('\n=== Testing User vs Customer Queries ===\n');
  
  // Test user query
  try {
    console.log('1. Testing user query...');
    const userQuery = gql`
      query GetUser($id: ID!) {
        user(id: $id, idType: EMAIL) {
          id
          email
          firstName
          lastName
        }
      }
    `;
    
    const userResult = await graphQLClient.request(userQuery, {
      id: 'as9184635@gmail.com',
    });
    
    console.log('User result:', JSON.stringify(userResult, null, 2));
  } catch (error) {
    console.log('User query failed:', error.response?.errors?.[0]?.message || error.message);
  }
  
  // Test customer query
  try {
    console.log('\n2. Testing customer query...');
    const customer = await testCustomerQuery();
    if (customer) {
      console.log('✅ Found customer!');
    } else {
      console.log('❌ No customer found');
    }
  } catch (error) {
    console.log('Customer query failed');
  }
}

async function testPasswordResetWithEmail() {
  console.log('\n=== Testing Password Reset Mutation ===\n');
  
  try {
    const resetMutation = gql`
      mutation SendPasswordResetEmail($input: SendPasswordResetEmailInput!) {
        sendPasswordResetEmail(input: $input) {
          success
          user {
            id
            email
            firstName
            lastName
          }
        }
      }
    `;
    
    const result = await graphQLClient.request(resetMutation, {
      input: {
        username: 'as9184635@gmail.com',
      }
    });
    
    console.log('Password reset result:', JSON.stringify(result, null, 2));
    
    if (result.sendPasswordResetEmail.success && result.sendPasswordResetEmail.user) {
      console.log('✅ User found for password reset!');
      return result.sendPasswordResetEmail.user;
    } else if (result.sendPasswordResetEmail.success && !result.sendPasswordResetEmail.user) {
      console.log('⚠️ Password reset successful but no user returned (user might not exist)');
    }
    
  } catch (error) {
    console.error('❌ Password reset error:', error.response?.errors || error.message);
  }
}

// Run all tests
await testUserVsCustomer();
await testPasswordResetWithEmail();