import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { GraphQLClient, gql } from 'graphql-request';

const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';

const GET_ORDER_QUERY = gql`
  query GetOrder($id: ID!) {
    order(id: $id, idType: DATABASE_ID) {
      id
      databaseId
      date
      status
      total
      subtotal
      shippingTotal
      totalTax
      paymentMethodTitle
      billing {
        firstName
        lastName
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
              image {
                sourceUrl
                altText
              }
            }
          }
          quantity
          total
        }
      }
    }
  }
`;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const cookieStore = cookies();
    const authCookie = cookieStore.get('woo_auth_token');
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token is valid
    try {
      const decodedToken = jwtDecode<{exp: number}>(authCookie.value);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (decodedToken.exp < currentTime) {
        return NextResponse.json(
          { success: false, message: 'Token expired' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const orderId = params.id;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Create GraphQL client with auth token
    const graphQLClient = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authCookie.value}`
      },
    });

    // Fetch order details
    const data = await graphQLClient.request<{
      order: any;
    }>(GET_ORDER_QUERY, { id: orderId });

    if (!data.order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: data.order
    });

  } catch (error: any) {
    console.error('Error fetching order details:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to fetch order details' 
      },
      { status: 500 }
    );
  }
}