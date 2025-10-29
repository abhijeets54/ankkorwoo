import { NextRequest, NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';

// Initialize GraphQL client
const endpoint = process.env.WOOCOMMERCE_GRAPHQL_URL || 'https://your-wordpress-site.com/graphql';

// GraphQL query to get coupon details
const GET_COUPON_QUERY = gql`
  query GetCoupon($code: String!) {
    coupon(code: $code) {
      id
      databaseId
      code
      amount
      discountType
      dateExpiry
      usageLimit
      usageLimitPerUser
      usageCount
      individualUse
      productIds
      excludedProductIds
      minimumAmount
      maximumAmount
      emailRestrictions
      description
    }
  }
`;

interface CouponData {
  coupon: {
    id: string;
    databaseId: number;
    code: string;
    amount: string;
    discountType: string;
    dateExpiry: string | null;
    usageLimit: number | null;
    usageLimitPerUser: number | null;
    usageCount: number;
    individualUse: boolean;
    productIds: number[];
    excludedProductIds: number[];
    minimumAmount: string | null;
    maximumAmount: string | null;
    emailRestrictions: string[];
    description: string | null;
  } | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, cartTotal, customerEmail } = body;

    if (!code) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Coupon code is required'
        },
        { status: 400 }
      );
    }

    // Create GraphQL client
    const graphQLClient = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Query WooCommerce for the coupon
    let couponData: CouponData;
    try {
      couponData = await graphQLClient.request<CouponData>(GET_COUPON_QUERY, {
        code: code.toUpperCase(), // WooCommerce stores coupons in uppercase
      });
    } catch (error: any) {
      console.error('GraphQL error fetching coupon:', error);

      // If coupon doesn't exist in WooCommerce, return invalid
      return NextResponse.json({
        valid: false,
        message: 'Invalid coupon code'
      });
    }

    // Check if coupon exists
    if (!couponData.coupon) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid coupon code'
      });
    }

    const coupon = couponData.coupon;

    // Validate expiry date
    if (coupon.dateExpiry) {
      const expiryDate = new Date(coupon.dateExpiry);
      const now = new Date();
      if (now > expiryDate) {
        return NextResponse.json({
          valid: false,
          message: 'This coupon has expired'
        });
      }
    }

    // Validate usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        valid: false,
        message: 'This coupon has reached its usage limit'
      });
    }

    // Validate minimum order amount
    if (coupon.minimumAmount && cartTotal) {
      const minAmount = parseFloat(coupon.minimumAmount);
      if (cartTotal < minAmount) {
        return NextResponse.json({
          valid: false,
          message: `Minimum order amount of ₹${minAmount.toFixed(2)} required`
        });
      }
    }

    // Validate maximum order amount
    if (coupon.maximumAmount && cartTotal) {
      const maxAmount = parseFloat(coupon.maximumAmount);
      if (cartTotal > maxAmount) {
        return NextResponse.json({
          valid: false,
          message: `Maximum order amount of ₹${maxAmount.toFixed(2)} exceeded`
        });
      }
    }

    // Validate email restrictions
    if (coupon.emailRestrictions && coupon.emailRestrictions.length > 0 && customerEmail) {
      const emailAllowed = coupon.emailRestrictions.some(allowedEmail => {
        // Support wildcard emails like *@example.com
        if (allowedEmail.includes('*')) {
          const pattern = allowedEmail.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`, 'i');
          return regex.test(customerEmail);
        }
        return allowedEmail.toLowerCase() === customerEmail.toLowerCase();
      });

      if (!emailAllowed) {
        return NextResponse.json({
          valid: false,
          message: 'This coupon is not valid for your email address'
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    const amount = parseFloat(coupon.amount);

    if (coupon.discountType === 'PERCENT') {
      // Percentage discount
      discountAmount = (cartTotal * amount) / 100;
    } else if (coupon.discountType === 'FIXED_CART') {
      // Fixed cart discount
      discountAmount = amount;
    } else if (coupon.discountType === 'FIXED_PRODUCT') {
      // Fixed product discount (would need product-level calculation)
      discountAmount = amount;
    }

    // Ensure discount doesn't exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    // Return valid coupon
    return NextResponse.json({
      valid: true,
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        amount: amount,
        discountType: coupon.discountType,
        discountAmount: Math.round(discountAmount * 100) / 100,
        description: coupon.description
      }
    });

  } catch (error: any) {
    console.error('Coupon validation error:', error);

    return NextResponse.json(
      {
        valid: false,
        message: 'Failed to validate coupon code'
      },
      { status: 500 }
    );
  }
}
