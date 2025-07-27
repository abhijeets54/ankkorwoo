import { NextRequest, NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';
import { cookies } from 'next/headers';

// Initialize GraphQL client
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';
const graphQLClient = new GraphQLClient(endpoint);

// Types for GraphQL responses
interface OrderResponse {
  createOrder: {
    clientMutationId: string;
    order: {
      id: string;
      databaseId: number;
      orderKey: string;
      orderNumber: string;
      status: string;
      total: string;
    };
  };
}

interface PaymentResponse {
  processPayment: {
    clientMutationId: string;
    paymentResult: {
      redirectUrl: string | null;
      paymentStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
      paymentDetails: string | null;
    };
  };
}

// Create order mutation
const CREATE_ORDER_MUTATION = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      clientMutationId
      order {
        id
        databaseId
        orderKey
        orderNumber
        status
        total
      }
    }
  }
`;

// Process payment mutation (for Stripe)
const PROCESS_PAYMENT_MUTATION = gql`
  mutation ProcessPayment($input: ProcessPaymentInput!) {
    processPayment(input: $input) {
      clientMutationId
      paymentResult {
        redirectUrl
        paymentStatus
        paymentDetails
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();

    // Validate stock for all items before creating order (skip in development if not configured)
    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_CHECKOUT_STOCK_VALIDATION) {
      try {
        const stockValidationResponse = await fetch(`${request.nextUrl.origin}/api/products/validate-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: body.line_items.map((item: any) => ({
              productId: item.product_id,
              variationId: item.variation_id,
              quantity: item.quantity
            }))
          })
        });

        if (stockValidationResponse.ok) {
          const stockValidation = await stockValidationResponse.json();
          if (!stockValidation.allAvailable) {
            const unavailableItems = stockValidation.validations
              .filter((v: any) => !v.available)
              .map((v: any) => v.message)
              .join(', ');

            return NextResponse.json(
              {
                success: false,
                message: `Some items are no longer available: ${unavailableItems}`,
                stockValidation: stockValidation.validations
              },
              { status: 400 }
            );
          }
        } else {
          console.warn('Stock validation failed during checkout, proceeding anyway');
        }
      } catch (stockError) {
        console.warn('Stock validation error during checkout, proceeding anyway:', stockError);
      }
    }

    // Get auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('woo_auth_token')?.value;
    
    // Create authenticated client if token exists
    const client = authToken 
      ? new GraphQLClient(endpoint, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
      : graphQLClient;
    
    // Prepare order input
    const orderInput = {
      clientMutationId: 'create_order',
      billing: {
        firstName: body.billing.first_name,
        lastName: body.billing.last_name,
        address1: body.billing.address_1,
        address2: body.billing.address_2 || '',
        city: body.billing.city,
        state: body.billing.state,
        postcode: body.billing.postcode,
        country: body.billing.country,
        email: body.billing.email,
        phone: body.billing.phone,
      },
      shipping: {
        firstName: body.shipping.first_name,
        lastName: body.shipping.last_name,
        address1: body.shipping.address_1,
        address2: body.shipping.address_2 || '',
        city: body.shipping.city,
        state: body.shipping.state,
        postcode: body.shipping.postcode,
        country: body.shipping.country,
      },
      lineItems: body.line_items.map((item: any) => ({
        productId: item.product_id,
        variationId: item.variation_id || null,
        quantity: item.quantity
      })),
      customerNote: body.customer_note || '',
      paymentMethod: body.payment_method,
      isPaid: body.payment_method === 'cod' ? false : true,
      status: body.payment_method === 'cod' ? 'PENDING' : 'PROCESSING'
    };
    
    // Create order
    const orderResponse = await client.request<OrderResponse>(CREATE_ORDER_MUTATION, {
      input: orderInput
    });
    
    if (!orderResponse.createOrder?.order) {
      throw new Error('Failed to create order');
    }
    
    const order = orderResponse.createOrder.order;
    
    // Handle payment processing for non-COD methods
    if (body.payment_method !== 'cod') {
      // For Stripe, we would process the payment here
      // This is a simplified example
      if (body.payment_method === 'stripe') {
        const paymentInput = {
          clientMutationId: 'process_payment',
          orderId: order.databaseId,
          paymentMethod: 'stripe',
          paymentData: {
            // Payment data would be included here
            // For a real implementation, this would include Stripe token/payment intent
          }
        };
        
        const paymentResponse = await client.request<PaymentResponse>(PROCESS_PAYMENT_MUTATION, {
          input: paymentInput
        });
        
        if (paymentResponse.processPayment?.paymentResult?.paymentStatus !== 'SUCCESS') {
          // If payment failed, we might want to cancel the order or mark it as failed
          throw new Error('Payment processing failed');
        }
        
        // For a real implementation, we might return a redirect URL for Stripe checkout
        if (paymentResponse.processPayment?.paymentResult?.redirectUrl) {
          return NextResponse.json({
            success: true,
            orderId: order.databaseId,
            redirectUrl: paymentResponse.processPayment.paymentResult.redirectUrl
          });
        }
      }
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      orderId: order.databaseId,
      orderKey: order.orderKey,
      orderNumber: order.orderNumber,
      status: order.status
    });
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during checkout'
      },
      { status: 500 }
    );
  }
} 