import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';

// Auth token cookie names
const AUTH_COOKIE_NAME = 'woo_auth_token';

// GraphQL endpoint
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';

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

// Get customer query
const GET_CUSTOMER_QUERY = gql`
  query GetCustomer {
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
`;

export async function POST(request: NextRequest) {
  try {
    console.log('Update profile API called');
    
    // Get the auth token from HTTP-only cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    
    if (!authToken) {
      console.log('No auth token found in cookies');
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const customerData = await request.json();
    console.log('Customer data to update:', customerData);
    
    // Create GraphQL client with auth token
    const client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
    });
    
    // Prepare the update variables
    const variables = {
      input: {
        clientMutationId: "updateCustomer",
        ...customerData
      }
    };
    
    console.log('GraphQL variables:', variables);
    
    // Execute the update mutation
    const updateResponse = await client.request<{
      updateCustomer: {
        customer: any;
      }
    }>(UPDATE_CUSTOMER_MUTATION, variables);

    console.log('Update response:', updateResponse);

    // Check if update was successful
    if (!updateResponse.updateCustomer || !updateResponse.updateCustomer.customer) {
      console.error('Customer update failed: No customer data returned');
      return NextResponse.json(
        { success: false, message: 'Failed to update customer profile' },
        { status: 400 }
      );
    }
    
    // Get the updated customer data
    const customerResponse = await client.request<{
      customer: any;
    }>(GET_CUSTOMER_QUERY);
    
    console.log('Updated customer data:', customerResponse.customer);
    
    return NextResponse.json({
      success: true,
      customer: customerResponse.customer,
      message: 'Profile updated successfully'
    });
    
  } catch (error: any) {
    console.error('Error updating customer profile:', error);
    
    // Handle specific GraphQL errors
    if (error.response?.errors) {
      const graphqlError = error.response.errors[0];
      return NextResponse.json(
        { success: false, message: graphqlError.message || 'Profile update failed' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
