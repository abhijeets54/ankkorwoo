import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pincode, cartItems, state } = body;

    // Validate input
    if (!pincode || !cartItems || !Array.isArray(cartItems)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Validate pincode format (6 digits for India)
    if (!/^[0-9]{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: 'Invalid pincode format' },
        { status: 400 }
      );
    }

    // Get shipping provider from environment
    const shippingProvider = process.env.SHIPPING_PROVIDER || 'woocommerce';

    let shippingRates = [];

    if (shippingProvider === 'woocommerce') {
      shippingRates = await getWooCommerceShippingRates(pincode, cartItems);
    } else if (shippingProvider === 'delhivery') {
      shippingRates = await getDelhiveryShippingRates(pincode, cartItems);
    } else {
      // Fallback to basic calculation
      shippingRates = await getBasicShippingRates(pincode, cartItems, state);
    }

    return NextResponse.json(shippingRates);

  } catch (error: any) {
    console.error('Shipping rates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate shipping rates' },
      { status: 500 }
    );
  }
}

async function getWooCommerceShippingRates(pincode: string, cartItems: any[]): Promise<any[]> {
  try {
    const wooUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooUrl || !consumerKey || !consumerSecret) {
      throw new Error('WooCommerce credentials not configured');
    }

    // Calculate cart totals
    const subtotal = cartItems.reduce((sum: number, item: any) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return sum + (price * item.quantity);
    }, 0);

    const totalWeight = cartItems.reduce((sum: number, item: any) => {
      // Assume 0.5kg per item if weight not specified
      return sum + (item.weight || 0.5) * item.quantity;
    }, 0);

    // Get shipping zones from WooCommerce
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const zonesResponse = await fetch(`${wooUrl}/wp-json/wc/v3/shipping/zones`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!zonesResponse.ok) {
      throw new Error('Failed to fetch shipping zones');
    }

    const zones = await zonesResponse.json();
    const shippingRates = [];

    // Find applicable zone based on pincode
    for (const zone of zones) {
      if (zone.id === 0) continue; // Skip "Rest of the World" zone

      // Get zone methods
      const methodsResponse = await fetch(`${wooUrl}/wp-json/wc/v3/shipping/zones/${zone.id}/methods`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (methodsResponse.ok) {
        const methods = await methodsResponse.json();

        for (const method of methods) {
          if (method.enabled) {
            let cost = 0;

            // Calculate cost based on method type
            if (method.method_id === 'flat_rate') {
              cost = parseFloat(method.settings?.cost?.value || '0');
            } else if (method.method_id === 'free_shipping') {
              const minAmount = parseFloat(method.settings?.min_amount?.value || '0');
              cost = subtotal >= minAmount ? 0 : parseFloat(method.settings?.cost?.value || '50');
            } else if (method.method_id === 'local_pickup') {
              cost = parseFloat(method.settings?.cost?.value || '0');
            }

            shippingRates.push({
              id: `${zone.id}_${method.instance_id}`,
              name: cost === 0 ? 'Free Shipping' : 'Standard Shipping',
              cost: cost,
              description: cost === 0 ? 'Free shipping on orders above minimum amount' : 'Standard delivery across India',
              estimatedDays: '5-7 days'
            });

            // Only take the first enabled method to ensure single shipping option
            break;
          }
        }

        // Break out of zone loop if we found a shipping method
        if (shippingRates.length > 0) {
          break;
        }
      }
    }

    // If no rates found, provide default rates
    if (shippingRates.length === 0) {
      return getBasicShippingRates(pincode, cartItems, state);
    }

    return shippingRates;

  } catch (error) {
    console.error('WooCommerce shipping error:', error);
    // Fallback to basic rates
    return getBasicShippingRates(pincode, cartItems);
  }
}

async function getDelhiveryShippingRates(pincode: string, cartItems: any[]): Promise<any[]> {
  try {
    // This would integrate with Delhivery API
    // For now, return basic rates with Delhivery-like options
    const totalWeight = cartItems.reduce((sum: number, item: any) => {
      return sum + (item.weight || 0.5) * item.quantity;
    }, 0);

    const shippingRates = [
      {
        id: 'delhivery_standard',
        name: 'Standard Shipping',
        cost: Math.max(50, totalWeight * 10),
        description: 'Standard delivery across India',
        estimatedDays: '5-7 days'
      }
    ];

    return shippingRates;
  } catch (error) {
    console.error('Delhivery shipping error:', error);
    return getBasicShippingRates(pincode, cartItems);
  }
}

async function getBasicShippingRates(pincode: string, cartItems: any[], providedState?: string): Promise<any[]> {
  const { calculateShippingCost, getLocationFromPincode } = await import('@/lib/locationUtils');

  const totalValue = cartItems.reduce((sum: number, item: any) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return sum + (price * item.quantity);
  }, 0);



  // Always prioritize provided state over pincode lookup
  let state = providedState || '';
  let shippingCost = 99; // Default for other states

  if (providedState) {
    // Use the selected state directly - this is the main logic
    state = providedState;
    shippingCost = calculateShippingCost(state, totalValue);

  } else {
    // Only fallback to pincode if no state is provided
    return NextResponse.json(
      { error: 'Please select a state to calculate shipping' },
      { status: 400 }
    );
  }

  const shippingRates = [];

  // Single shipping method with automatic pricing
  const shippingName = 'Standard Shipping';

  shippingRates.push({
    id: 'standard',
    name: shippingName,
    cost: shippingCost,
    description: 'Standard delivery across India',
    estimatedDays: '5-7 days',
    state: state
  });

  // Express shipping (available for most pincodes)
  const metroAreas = ['110001', '400001', '560001', '600001', '700001'];
  if (metroAreas.includes(pincode)) {
    shippingRates.push({
      id: 'express',
      name: 'Express Shipping',
      cost: 150,
      description: 'Delivered in 2-3 business days',
      estimatedDays: '2-3 days'
    });

    // Same day delivery for metro areas
    shippingRates.push({
      id: 'same_day',
      name: 'Same Day Delivery',
      cost: 300,
      description: 'Delivered today before 9 PM',
      estimatedDays: 'Today'
    });
  } else {
    // Express for non-metro areas
    shippingRates.push({
      id: 'express',
      name: 'Express Shipping',
      cost: 200,
      description: 'Delivered in 3-4 business days',
      estimatedDays: '3-4 days'
    });
  }

  return shippingRates;
}

function getEstimatedDays(methodId: string, pincode: string): string {
  const metroAreas = ['110001', '400001', '560001', '600001', '700001'];
  const isMetro = metroAreas.includes(pincode);

  switch (methodId) {
    case 'free_shipping':
    case 'flat_rate':
      return isMetro ? '3-5 days' : '5-7 days';
    case 'local_pickup':
      return 'Same day';
    default:
      return '5-7 days';
  }
}
