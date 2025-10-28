interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  paymentMethod: string;
}

export function generateOrderConfirmationEmail(data: OrderEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c2c27; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .order-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .total-row { font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #333; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .button { background-color: #2c2c27; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmation</h1>
      <p>Thank you for your order!</p>
    </div>

    <div class="content">
      <h2>Hi ${data.customerName},</h2>
      <p>Your order has been received and is being processed.</p>

      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> #${data.orderNumber}</p>
        <p><strong>Order Date:</strong> ${data.orderDate}</p>
        <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>

        <h4 style="margin-top: 20px;">Items Ordered:</h4>
        ${data.items.map(item => `
          <div class="item-row">
            <span>${item.name} × ${item.quantity}</span>
            <span>₹${item.price.toFixed(2)}</span>
          </div>
        `).join('')}

        <div class="item-row">
          <span>Subtotal</span>
          <span>₹${data.subtotal.toFixed(2)}</span>
        </div>
        <div class="item-row">
          <span>Shipping</span>
          <span>₹${data.shipping.toFixed(2)}</span>
        </div>
        <div class="item-row total-row">
          <span>Total</span>
          <span>₹${data.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="order-details">
        <h3>Shipping Address</h3>
        <p>
          ${data.shippingAddress.address1}<br>
          ${data.shippingAddress.address2 ? data.shippingAddress.address2 + '<br>' : ''}
          ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.pincode}<br>
          Phone: ${data.shippingAddress.phone}
        </p>
      </div>

      <div style="text-align: center;">
        <a href="https://ankkor.in/account" class="button">View Your Orders</a>
      </div>

      <p style="margin-top: 30px;">
        If you have any questions about your order, please contact us at support@ankkor.in
      </p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Ankkor. All rights reserved.</p>
      <p>This email was sent to you because you placed an order on our website.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
