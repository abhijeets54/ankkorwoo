import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { GraphQLClient, gql } from 'graphql-request';

const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';

const GET_CUSTOMER_QUERY = gql`
  query GetCustomer {
    customer {
      id
      databaseId
      email
      firstName
      lastName
      displayName
      username
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
      orders(first: 50, where: {orderby: {field: DATE, order: DESC}}) {
        nodes {
          id
          databaseId
          date
          status
          total
          subtotal
          totalTax
          shippingTotal
          discountTotal
          paymentMethodTitle
          customerNote
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
          lineItems {
            nodes {
              product {
                node {
                  id
                  name
                  slug
                  image {
                    sourceUrl
                    altText
                  }
                }
              }
              variation {
                node {
                  id
                  name
                  attributes {
                    nodes {
                      name
                      value
                    }
                  }
                }
              }
              quantity
              total
              subtotal
              totalTax
            }
          }
          shippingLines {
            nodes {
              methodTitle
              total
            }
          }
          feeLines {
            nodes {
              name
              total
            }
          }
          couponLines {
            nodes {
              code
              discount
            }
          }
        }
      }
    }
  }
`;

export async function GET(request: NextRequest) {
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
      const decodedToken = jwtDecode<{ exp: number }>(authCookie.value);
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

    // Create GraphQL client with auth token
    const graphQLClient = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authCookie.value}`
      },
    });

    // Fetch customer data with orders
    const data = await graphQLClient.request<{ customer: any }>(GET_CUSTOMER_QUERY);

    if (!data.customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: data.customer
    });

  } catch (error: any) {
    console.error('Error fetching customer data:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch customer data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
