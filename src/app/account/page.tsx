import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { GraphQLClient, gql } from 'graphql-request';
import AccountDashboard from '@/components/account/AccountDashboard';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Account | Ankkor',
  description: 'View your account details, order history, and manage your profile.',
};

// Define WooCommerce Customer interface for API responses
interface WooCustomer {
  id: string;
  databaseId: number;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  billing?: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping?: {
    firstName: string;
    lastName: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  orders?: {
    nodes: Array<{
      id: string;
      databaseId: number;
      date: string;
      status: string;
      total: string;
      lineItems: {
        nodes: Array<{
          product: {
            node: {
              id: string;
              name: string;
            };
          };
          quantity: number;
          total: string;
        }>;
      };
    }>;
  };
}

// GraphQL endpoint
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';

// Get customer query with enhanced order details and pagination
const GET_CUSTOMER_QUERY = gql`
  query GetCustomer {
    customer {
      id
      databaseId
      email
      firstName
      lastName
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
      orders(first: 20, where: {orderby: {field: DATE, order: DESC}}) {
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
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`;

async function getCustomerData(authToken: string) {
  // Create GraphQL client with auth token
  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
  });

  try {
    const data = await graphQLClient.request<{
      customer: WooCustomer;
    }>(GET_CUSTOMER_QUERY);
    
    return {
      success: true,
      customer: data.customer
    };
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return {
      success: false,
      error: 'Failed to fetch customer data'
    };
  }
}

export default async function AccountPage() {
  // Check if user is authenticated by verifying the auth cookie
  const cookieStore = cookies();
  const authCookie = cookieStore.get('woo_auth_token');
  
  if (!authCookie || !authCookie.value) {
    // Redirect to login page if not authenticated
    redirect('/sign-in?redirect=/account');
  }
  
  // Verify the token is valid and not expired
  try {
    const decodedToken = jwtDecode<{exp: number}>(authCookie.value);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // If token is expired, redirect to login
    if (decodedToken.exp < currentTime) {
      redirect('/sign-in?redirect=/account&reason=expired');
    }
  } catch (error) {
    console.error('Invalid JWT token:', error);
    redirect('/sign-in?redirect=/account&reason=invalid');
  }
  
  // Get customer data using the auth token
  const customerResponse = await getCustomerData(authCookie.value);
  const customer = customerResponse.success ? customerResponse.customer : null;
  
  // If we couldn't get customer data despite having a valid token,
  // there might be an issue with the token or the WooCommerce API
  if (!customer) {
    // Option 1: Show error message
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-serif mb-8">My Account</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Unable to load account information. Please try <a href="/sign-in" className="underline">signing in again</a>.
        </div>
      </div>
    );
    
    // Option 2: Redirect to login (uncomment to use this approach instead)
    // redirect('/sign-in?redirect=/account&reason=fetch_error');
  }
  
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-serif mb-8">My Account</h1>

      {customer ? (
        <AccountDashboard />
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          Unable to load account information. Please try again later.
        </div>
      )}
    </div>
  );
} 