/**
 * Cash on Delivery (COD) Prepayment System
 * 
 * This module handles COD orders with ₹100 convenience fee prepayment
 * Flow: Customer pays ₹100 online -> Order confirmed -> Pay remaining on delivery
 */

export interface CODPrepaymentOrder {
  orderId: string;
  totalAmount: number;
  prepaidAmount: number; // ₹100 convenience fee
  codAmount: number; // Amount to be paid on delivery
  prepaymentStatus: 'pending' | 'paid' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CODCheckoutData {
  address: any;
  cartItems: any[];
  shipping: any;
  paymentMethod: 'cod_prepaid' | 'online';
}

/**
 * Calculate COD amounts
 * @param subtotal Order subtotal
 * @param shippingCost Shipping cost
 * @param discountAmount Discount amount (if any)
 * @returns COD payment breakdown
 */
export const calculateCODAmounts = (subtotal: number, shippingCost: number = 0, discountAmount: number = 0) => {
  const CONVENIENCE_FEE = 100; // ₹100 fixed convenience fee
  const totalOrderAmount = subtotal + shippingCost - discountAmount; // Apply discount

  return {
    totalOrderAmount,
    convenienteFee: CONVENIENCE_FEE,
    prepaidAmount: CONVENIENCE_FEE, // Customer pays ₹100 online
    codAmount: totalOrderAmount, // Customer pays full order amount on delivery
    totalCost: totalOrderAmount + CONVENIENCE_FEE, // What customer pays in total
    discountAmount // Return discount amount for reference
  };
};

/**
 * Create COD prepayment record (stored in WooCommerce as order meta)
 * @param orderData Order data
 * @returns COD prepayment order details
 */
export const createCODPrepaymentOrder = async (orderData: CODCheckoutData): Promise<CODPrepaymentOrder> => {
  const subtotal = orderData.cartItems.reduce((total, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return total + (price * item.quantity);
  }, 0);

  const { totalOrderAmount, prepaidAmount, codAmount } = calculateCODAmounts(subtotal, orderData.shipping.cost);
  
  const codOrder: CODPrepaymentOrder = {
    orderId: `cod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    totalAmount: totalOrderAmount,
    prepaidAmount,
    codAmount,
    prepaymentStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // This will be stored in WooCommerce order meta_data when order is created
  // No separate database needed - WooCommerce handles storage
  return codOrder;
};

/**
 * Update prepayment status
 * @param orderId COD order ID
 * @param status New status
 * @param razorpayData Razorpay payment details
 */
export const updateCODPrepaymentStatus = async (
  orderId: string, 
  status: 'paid' | 'failed',
  razorpayData?: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
  }
): Promise<void> => {
  // In a real application, update database record
  console.log(`COD Order ${orderId} prepayment status updated to: ${status}`);
  
  if (razorpayData) {
    console.log('Razorpay details:', razorpayData);
  }
};

/**
 * Get COD order breakdown for display
 * @param cartItems Cart items
 * @param shipping Shipping details
 * @returns Formatted breakdown
 */
export const getCODOrderBreakdown = (cartItems: any[], shipping: any) => {
  const subtotal = cartItems.reduce((total, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return total + (price * item.quantity);
  }, 0);

  const amounts = calculateCODAmounts(subtotal, shipping.cost);
  
  return {
    subtotal: subtotal,
    shipping: shipping.cost,
    orderTotal: amounts.totalOrderAmount,
    convenienceFee: amounts.convenienteFee,
    payOnline: amounts.prepaidAmount,
    payOnDelivery: amounts.codAmount,
    totalCost: amounts.totalCost,
    breakdown: [
      { label: 'Subtotal', amount: subtotal },
      { label: 'Shipping', amount: shipping.cost },
      { label: 'Order Total', amount: amounts.totalOrderAmount },
      { label: 'COD Convenience Fee', amount: amounts.convenienteFee, highlight: true },
      { label: 'Pay Online Now', amount: amounts.prepaidAmount, type: 'online' },
      { label: 'Pay on Delivery', amount: amounts.codAmount, type: 'cod' },
      { label: 'Total Cost to You', amount: amounts.totalCost, total: true }
    ]
  };
};