import { NextRequest, NextResponse } from 'next/server';

/**
 * Validate WooCommerce Coupon using REST API v3
 * Official Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/#coupons
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, cartTotal, customerEmail } = body;

    console.log('🎫 Validating coupon:', { code, cartTotal, customerEmail });

    if (!code) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Coupon code is required'
        },
        { status: 400 }
      );
    }

    // Get WooCommerce credentials
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      console.error('❌ WooCommerce credentials not configured');
      return NextResponse.json(
        {
          valid: false,
          message: 'Server configuration error'
        },
        { status: 500 }
      );
    }

    // Normalize coupon code (trim and uppercase)
    const normalizedCode = code.trim().toUpperCase();

    // Create Basic Auth header
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    // Fetch coupon by code using WooCommerce REST API v3
    // Endpoint: GET /wp-json/wc/v3/coupons?code=COUPONCODE
    const couponUrl = `${wooUrl}/wp-json/wc/v3/coupons?code=${encodeURIComponent(normalizedCode)}`;

    console.log('🔍 Fetching coupon from WooCommerce:', couponUrl);

    const response = await fetch(couponUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ WooCommerce API error:', response.status, response.statusText);
      return NextResponse.json({
        valid: false,
        message: 'Failed to validate coupon'
      });
    }

    const coupons = await response.json();

    console.log('📦 Coupons received:', coupons.length);

    // Check if coupon exists
    if (!coupons || coupons.length === 0) {
      console.log('❌ Coupon not found');
      return NextResponse.json({
        valid: false,
        message: 'Invalid coupon code'
      });
    }

    const coupon = coupons[0];

    console.log('✅ Coupon found:', {
      code: coupon.code,
      amount: coupon.amount,
      discount_type: coupon.discount_type,
      date_expires: coupon.date_expires,
      usage_count: coupon.usage_count,
      usage_limit: coupon.usage_limit
    });

    // Validate expiry date
    if (coupon.date_expires) {
      const expiryDate = new Date(coupon.date_expires);
      const now = new Date();
      if (now > expiryDate) {
        console.log('❌ Coupon expired');
        return NextResponse.json({
          valid: false,
          message: 'This coupon has expired'
        });
      }
    }

    // Validate usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      console.log('❌ Usage limit reached');
      return NextResponse.json({
        valid: false,
        message: 'This coupon has reached its usage limit'
      });
    }

    // Validate minimum order amount
    if (coupon.minimum_amount && cartTotal) {
      const minAmount = parseFloat(coupon.minimum_amount);
      // Only validate if minimum amount is greater than 0
      if (minAmount > 0 && cartTotal < minAmount) {
        console.log('❌ Below minimum amount');
        return NextResponse.json({
          valid: false,
          message: `Minimum order amount of ₹${minAmount.toFixed(2)} required`
        });
      }
    }

    // Validate maximum order amount
    // Note: WooCommerce returns "0.00" for no maximum, so we need to check if it's actually set
    if (coupon.maximum_amount && cartTotal) {
      const maxAmount = parseFloat(coupon.maximum_amount);
      // Only validate if maximum amount is greater than 0 (0 means no limit in WooCommerce)
      if (maxAmount > 0 && cartTotal > maxAmount) {
        console.log('❌ Above maximum amount');
        return NextResponse.json({
          valid: false,
          message: `Maximum order amount of ₹${maxAmount.toFixed(2)} exceeded`
        });
      }
    }

    // Validate email restrictions
    if (coupon.email_restrictions && coupon.email_restrictions.length > 0 && customerEmail) {
      const emailAllowed = coupon.email_restrictions.some((allowedEmail: string) => {
        // Support wildcard emails like *@example.com
        if (allowedEmail.includes('*')) {
          const pattern = allowedEmail.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`, 'i');
          return regex.test(customerEmail);
        }
        return allowedEmail.toLowerCase() === customerEmail.toLowerCase();
      });

      if (!emailAllowed) {
        console.log('❌ Email not allowed');
        return NextResponse.json({
          valid: false,
          message: 'This coupon is not valid for your email address'
        });
      }
    }

    // Calculate discount amount based on type
    let discountAmount = 0;
    const amount = parseFloat(coupon.amount);

    if (coupon.discount_type === 'percent') {
      // Percentage discount
      discountAmount = (cartTotal * amount) / 100;
    } else if (coupon.discount_type === 'fixed_cart') {
      // Fixed cart discount
      discountAmount = amount;
    } else if (coupon.discount_type === 'fixed_product') {
      // Fixed product discount
      discountAmount = amount;
    }

    // Ensure discount doesn't exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    console.log('✅ Coupon valid! Discount amount:', discountAmount);

    // Return valid coupon
    return NextResponse.json({
      valid: true,
      message: 'Coupon applied successfully',
      coupon: {
        code: coupon.code,
        amount: amount,
        discountType: coupon.discount_type,
        discountAmount: Math.round(discountAmount * 100) / 100,
        description: coupon.description
      }
    });

  } catch (error: any) {
    console.error('❌ Coupon validation error:', error);

    return NextResponse.json(
      {
        valid: false,
        message: 'Failed to validate coupon code'
      },
      { status: 500 }
    );
  }
}
