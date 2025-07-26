/**
 * Advanced Order Creation Utility
 * 
 * This module provides functions for creating orders with special requirements
 * that cannot be handled by the standard WooCommerce Store API.
 * It uses GraphQL mutations for more complex order scenarios.
 */

import { GraphQLClient, gql } from 'graphql-request';

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

/**
 * Create an order with advanced options using GraphQL
 * 
 * This function should only be used for special cases that cannot be handled
 * by the standard WooCommerce Store API checkout process.
 */
export async function createAdvancedOrder(
  orderData: {
    billing: {
      first_name: string;
      last_name: string;
      address_1: string;
      address_2?: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
      email: string;
      phone: string;
    };
    shipping: {
      first_name: string;
      last_name: string;
      address_1: string;
      address_2?: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
    line_items: Array<{
      product_id: string | number;
      variation_id?: string | number;
      quantity: number;
    }>;
    customer_note?: string;
    payment_method: string;
    payment_data?: any;
  },
  authToken?: string
) {
  try {
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
        firstName: orderData.billing.first_name,
        lastName: orderData.billing.last_name,
        address1: orderData.billing.address_1,
        address2: orderData.billing.address_2 || '',
        city: orderData.billing.city,
        state: orderData.billing.state,
        postcode: orderData.billing.postcode,
        country: orderData.billing.country,
        email: orderData.billing.email,
        phone: orderData.billing.phone,
      },
      shipping: {
        firstName: orderData.shipping.first_name,
        lastName: orderData.shipping.last_name,
        address1: orderData.shipping.address_1,
        address2: orderData.shipping.address_2 || '',
        city: orderData.shipping.city,
        state: orderData.shipping.state,
        postcode: orderData.shipping.postcode,
        country: orderData.shipping.country,
      },
      lineItems: orderData.line_items.map((item) => ({
        productId: Number(item.product_id),
        variationId: item.variation_id ? Number(item.variation_id) : null,
        quantity: item.quantity
      })),
      customerNote: orderData.customer_note || '',
      paymentMethod: orderData.payment_method,
      isPaid: orderData.payment_method === 'cod' ? false : true,
      status: orderData.payment_method === 'cod' ? 'PENDING' : 'PROCESSING'
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
    if (orderData.payment_method !== 'cod') {
      // For Stripe, we would process the payment here
      if (orderData.payment_method === 'stripe') {
        const paymentInput = {
          clientMutationId: 'process_payment',
          orderId: order.databaseId,
          paymentMethod: 'stripe',
          paymentData: orderData.payment_data || {}
        };
        
        const paymentResponse = await client.request<PaymentResponse>(PROCESS_PAYMENT_MUTATION, {
          input: paymentInput
        });
        
        if (paymentResponse.processPayment?.paymentResult?.paymentStatus !== 'SUCCESS') {
          // If payment failed, we might want to cancel the order or mark it as failed
          throw new Error('Payment processing failed');
        }
        
        // Return with redirect URL if available
        if (paymentResponse.processPayment?.paymentResult?.redirectUrl) {
          return {
            success: true,
            orderId: order.databaseId,
            orderKey: order.orderKey,
            orderNumber: order.orderNumber,
            status: order.status,
            redirectUrl: paymentResponse.processPayment.paymentResult.redirectUrl
          };
        }
      }
    }
    
    // Return success response
    return {
      success: true,
      orderId: order.databaseId,
      orderKey: order.orderKey,
      orderNumber: order.orderNumber,
      status: order.status
    };
    
  } catch (error) {
    console.error('Advanced order creation error:', error);
    throw error;
  }
} 