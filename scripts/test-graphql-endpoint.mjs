#!/usr/bin/env node

import { GraphQLClient, gql } from 'graphql-request';

const endpoint = 'https://maroon-lapwing-781450.hostingersite.com/graphql';

// Test basic GraphQL connectivity
const TEST_QUERY = gql`
  query TestConnection {
    generalSettings {
      title
      url
    }
  }
`;

// Test login mutation
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

async function testGraphQLEndpoint() {
  console.log('🔍 Testing GraphQL endpoint connectivity...');
  console.log(`Endpoint: ${endpoint}`);
  
  const client = new GraphQLClient(endpoint);
  
  try {
    // Test basic connectivity
    console.log('\n1. Testing basic GraphQL connectivity...');
    const basicResponse = await client.request(TEST_QUERY);
    console.log('✅ Basic GraphQL connection successful');
    console.log('Site title:', basicResponse.generalSettings.title);
    console.log('Site URL:', basicResponse.generalSettings.url);
    
    // Test login mutation
    console.log('\n2. Testing login mutation...');
    const loginResponse = await client.request(LOGIN_MUTATION, {
      username: 'as9184635@gmail.com',
      password: 'nirmalkaur'
    });
    
    if (loginResponse.login && loginResponse.login.authToken) {
      console.log('✅ Login successful!');
      console.log('User ID:', loginResponse.login.user.id);
      console.log('Email:', loginResponse.login.user.email);
      console.log('Token received:', loginResponse.login.authToken.substring(0, 50) + '...');
    } else {
      console.log('❌ Login failed - no auth token returned');
    }
    
  } catch (error) {
    console.error('❌ GraphQL test failed:');
    
    if (error.response?.errors) {
      console.error('GraphQL errors:');
      error.response.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.message}`);
        if (err.extensions) {
          console.error('     Extensions:', err.extensions);
        }
      });
    } else {
      console.error('Network/Connection error:', error.message);
    }
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Verify WordPress site is accessible');
    console.log('2. Check if WPGraphQL plugin is installed and activated');
    console.log('3. Check if WPGraphQL JWT Authentication plugin is installed and activated');
    console.log('4. Verify wp-config.php has GRAPHQL_JWT_AUTH_SECRET_KEY defined');
    console.log('5. Check if the user account exists in WordPress');
    console.log('6. Check WordPress error logs for more details');
    
    process.exit(1);
  }
}

testGraphQLEndpoint();
