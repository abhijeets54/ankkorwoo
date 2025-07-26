import { getCart } from './shopify';

/**
 * Redirects to Shopify checkout page
 * @param cartId The ID of the cart to checkout
 * @returns A promise that resolves when the redirect is complete
 */
export async function redirectToCheckout(cartId: string): Promise<void> {
  try {
    console.log(`Redirecting to checkout for cart: ${cartId}`);
    
    // Validate the cart before checkout
    const isValid = await validateCartForCheckout(cartId);
    if (!isValid) {
      throw new Error('Cart validation failed. Some items may be out of stock or unavailable.');
    }
    
    // Get the cart to retrieve the checkout URL
    const cart = await getCart(cartId);
    
    if (!cart || !cart.checkoutUrl) {
      throw new Error('No checkout URL found for cart');
    }
    
    // Prepare the checkout URL with return parameters
    let checkoutUrl = cart.checkoutUrl;
    
    // Add return_to parameter to redirect back to our site after checkout
    // Get the base URL of our site
    const baseUrl = window.location.origin;
    const returnUrl = `${baseUrl}/checkout/thank-you`;
    
    // Append return_to parameter to the checkout URL
    const urlObj = new URL(checkoutUrl);
    urlObj.searchParams.set('return_to', returnUrl);
    checkoutUrl = urlObj.toString();
    
    console.log(`Checkout URL with return path: ${checkoutUrl}`);
    
    // Redirect to the checkout URL
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}

/**
 * Prepares checkout data for client-side rendering
 * @param cartId The ID of the cart to prepare checkout data for
 * @returns The checkout URL and cart data
 */
export async function prepareCheckout(cartId: string) {
  try {
    console.log(`Preparing checkout data for cart: ${cartId}`);
    
    // Get the cart to retrieve the checkout URL
    const cart = await getCart(cartId);
    
    if (!cart || !cart.checkoutUrl) {
      throw new Error('No checkout URL found for cart');
    }
    
    // Calculate estimated delivery dates
    const deliveryEstimates = calculateDeliveryEstimates();
    
    return {
      checkoutUrl: cart.checkoutUrl,
      cart,
      deliveryEstimates
    };
  } catch (error) {
    console.error('Error preparing checkout:', error);
    throw error;
  }
}

/**
 * Validates if a cart is ready for checkout
 * @param cartId The ID of the cart to validate
 * @returns True if the cart is valid for checkout, false otherwise
 */
export async function validateCartForCheckout(cartId: string): Promise<boolean> {
  try {
    console.log(`Validating cart for checkout: ${cartId}`);
    
    // Get the cart
    const cart = await getCart(cartId);
    
    // Check if cart exists and has items
    if (!cart || !cart.lines || cart.lines.edges.length === 0) {
      console.warn('Cart is empty or not found');
      return false;
    }
    
    // Check if all items in the cart are available
    const allItemsAvailable = cart.lines.edges.every((edge: any) => {
      const node = edge.node;
      const isAvailable = node.merchandise.availableForSale;
      
      if (!isAvailable) {
        console.warn(`Item ${node.merchandise.product.title} is not available for sale`);
      }
      
      return isAvailable;
    });
    
    if (!allItemsAvailable) {
      console.warn('Some items in the cart are not available for sale');
    } else {
      console.log('All items in cart are available for checkout');
    }
    
    return allItemsAvailable;
  } catch (error) {
    console.error('Error validating cart for checkout:', error);
    return false;
  }
}

/**
 * Calculates estimated delivery dates for different shipping methods
 * @returns Object with delivery estimates for each shipping method
 */
function calculateDeliveryEstimates() {
  const now = new Date();
  
  // Standard shipping (5-7 business days)
  const standardMin = new Date(now);
  standardMin.setDate(standardMin.getDate() + 5);
  const standardMax = new Date(now);
  standardMax.setDate(standardMax.getDate() + 7);
  
  // Express shipping (2-3 business days)
  const expressMin = new Date(now);
  expressMin.setDate(expressMin.getDate() + 2);
  const expressMax = new Date(now);
  expressMax.setDate(expressMax.getDate() + 3);
  
  // Overnight shipping (1 business day)
  const overnight = new Date(now);
  overnight.setDate(overnight.getDate() + 1);
  
  // Format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return {
    standard: {
      min: formatDate(standardMin),
      max: formatDate(standardMax),
      range: `${formatDate(standardMin)} - ${formatDate(standardMax)}`
    },
    express: {
      min: formatDate(expressMin),
      max: formatDate(expressMax),
      range: `${formatDate(expressMin)} - ${formatDate(expressMax)}`
    },
    overnight: {
      date: formatDate(overnight),
      range: formatDate(overnight)
    }
  };
} 