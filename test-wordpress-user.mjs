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

console.log('🔧 Testing WordPress/WooCommerce User Existence');
console.log('==============================================\n');

console.log('GraphQL URL:', process.env.WOOCOMMERCE_GRAPHQL_URL);
console.log('Testing email: as9184635@gmail.com\n');

async function testSendPasswordResetEmail() {
  try {
    console.log('Testing sendPasswordResetEmail mutation...');
    
    const resetEmailMutation = gql`
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
    
    const result = await graphQLClient.request(resetEmailMutation, {
      input: {
        username: 'as9184635@gmail.com',
      }
    });
    
    console.log('✅ GraphQL Response:', JSON.stringify(result, null, 2));
    
    if (result?.sendPasswordResetEmail?.success) {
      console.log('✅ User exists and password reset email was triggered');
      if (result.sendPasswordResetEmail.user) {
        console.log('User details:', result.sendPasswordResetEmail.user);
      }
      return result.sendPasswordResetEmail.user;
    } else {
      console.log('❌ User does not exist or mutation failed');
      return null;
    }
    
  } catch (error) {
    console.error('❌ GraphQL Error:', error);
    console.error('Error details:', error.response?.errors || error.message);
    return null;
  }
}

// Test user existence
const user = await testSendPasswordResetEmail();

if (user) {
  console.log('\n✅ User found in WordPress! The forgot password flow should work.');
  console.log('If emails are not being sent, check:');
  console.log('1. WordPress email configuration');
  console.log('2. SMTP settings');
  console.log('3. Server logs for any errors');
} else {
  console.log('\n❌ User NOT found in WordPress/WooCommerce.');
  console.log('Solutions:');
  console.log('1. Create a user account with email: as9184635@gmail.com');
  console.log('2. Or test with an existing WordPress user email');
}