import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GraphQLClient, gql } from 'graphql-request';

const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';

const GET_CUSTOMER_ORDERS = gql`
  query GetCustomerOrders {
    customer {
      id
      databaseId
      email
      orders(first: 20, where: {orderby: {field: DATE, order: DESC}}) {
        nodes {
          id
          databaseId
          date
          status
          total
          paymentMethodTitle
        }
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('woo_auth_token');

    if (!authCookie || !authCookie.value) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
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

    const data = await graphQLClient.request<{ customer: any }>(GET_CUSTOMER_ORDERS);

    return NextResponse.json({
      customerId: data.customer.databaseId,
      email: data.customer.email,
      ordersCount: data.customer.orders.nodes.length,
      orders: data.customer.orders.nodes,
      message: 'Orders fetched successfully via GraphQL'
    });

  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      {
        error: error.message,
        response: error.response
      },
      { status: 500 }
    );
  }
}
