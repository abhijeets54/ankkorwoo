import { Resend } from 'resend';
import { generateOrderConfirmationEmail } from './email-templates/order-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

interface CartItem {
  name: string;
  quantity: number;
  price: number;
  productId: string;
  variationId?: string;
  attributes?: Array<{ name: string; value: string }>;
}

interface ShippingInfo {
  cost: number;
  name: string;
}

interface AddressInfo {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

interface OrderData {
  cartItems: CartItem[];
  shipping: ShippingInfo;
  total: number;
  address: AddressInfo;
  paymentMethod: 'online' | 'cod';
}

interface SendOrderConfirmationParams {
  to: string;
  customerName: string;
  orderNumber: string;
  orderData: OrderData;
}

export async function sendOrderConfirmationEmail(params: SendOrderConfirmationParams) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not configured, skipping email send');
      return { success: false, error: 'API key not configured' };
    }

    // Calculate subtotal
    const subtotal = params.orderData.cartItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    const emailHtml = generateOrderConfirmationEmail({
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      orderDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      items: params.orderData.cartItems.map((item) => ({
        name: item.attributes && item.attributes.length > 0
          ? `${item.name} (Size: ${item.attributes.find(a => a.name.toLowerCase() === 'size')?.value || 'N/A'}${
              item.attributes.filter(a => a.name.toLowerCase() !== 'size').length > 0 
                ? `, ${item.attributes.filter(a => a.name.toLowerCase() !== 'size').map(a => `${a.name}: ${a.value}`).join(', ')}` 
                : ''
            })`
          : item.name,
        quantity: item.quantity,
        price: item.price * item.quantity
      })),
      subtotal,
      shipping: params.orderData.shipping.cost,
      total: params.orderData.total,
      shippingAddress: params.orderData.address,
      paymentMethod: params.orderData.paymentMethod === 'online'
        ? 'Online Payment (Razorpay)'
        : 'Cash on Delivery'
    });

    const { data: result, error } = await resend.emails.send({
      from: 'Ankkor <orders@ankkor.in>', // Change this to your verified domain
      to: params.to,
      subject: `Order Confirmation - #${params.orderNumber}`,
      html: emailHtml
    });

    if (error || !result) {
      throw new Error(error?.message || 'Failed to send email');
    }

    console.log('✅ Order confirmation email sent via Resend:', result.id);
    return { success: true, messageId: result.id };
  } catch (error: any) {
    console.error('❌ Failed to send order confirmation email via Resend:', error);

    // Log more details for debugging
    if (error.message) {
      console.error('Error message:', error.message);
    }

    return { success: false, error: error.message || 'Unknown error' };
  }
}
