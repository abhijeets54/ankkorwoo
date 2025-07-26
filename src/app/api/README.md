# Shopify Webhook Integration

This folder contains API routes for handling Shopify webhooks to keep your frontend data in sync with your Shopify backend.

## Webhook Endpoints

The following webhook endpoints are available:

1. `/api/webhooks` - General webhook handler for all types of webhooks
2. `/api/webhooks/inventory` - Dedicated handler for inventory update webhooks
3. `/api/webhooks/orders` - Dedicated handler for order-related webhooks
4. `/api/webhooks/products` - Dedicated handler for product-related webhooks

## Webhook Configuration in Shopify

To configure the webhooks in your Shopify admin:

1. Go to **Settings** > **Notifications** > **Webhooks**
2. Click **Create webhook**
3. Select the event topic (e.g., `inventory_levels/update`, `products/update`, `orders/create`)
4. Set the webhook URL to your endpoint:
   - For development: `https://{your-ngrok-url}/api/webhooks/inventory` (for inventory webhooks)
   - For production: `https://ankkor.in/api/webhooks/inventory` (for inventory webhooks)
5. Select the API version (use the latest stable version)
6. Set the format to JSON
7. Save the webhook

Repeat for each webhook type you need.

## Required Webhooks

At minimum, you should configure the following webhooks:

1. **Inventory updates**: `inventory_levels/update` pointing to `/api/webhooks/inventory`
2. **Product updates**: `products/update` pointing to `/api/webhooks/products`
3. **Order creation**: `orders/create` pointing to `/api/webhooks/orders`

## Testing Webhooks Locally

To test webhooks in development:

1. Install [ngrok](https://ngrok.com/) or a similar tool to expose your local server
2. Start your Next.js development server:
   ```
   npm run dev
   ```
3. In a separate terminal, start ngrok:
   ```
   ngrok http 3000
   ```
4. Use the provided ngrok URL (e.g., `https://abc123.ngrok.io`) as the base URL for your webhooks in Shopify
5. Perform actions in your Shopify admin (update inventory, create products, place orders) to trigger the webhooks

## Environment Variables

Ensure you have set the following environment variables:

```
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret
SHOPIFY_LOCATION_ID=your_shopify_location_id
```

The webhook secret is used to validate that the requests are coming from Shopify.

## Security Considerations

All webhook endpoints implement HMAC validation to ensure that the requests are legitimate and coming from Shopify.

## Troubleshooting

If webhooks aren't working:

1. Check that the webhook URLs are correctly configured in Shopify
2. Verify that your ngrok tunnel is running (for local testing)
3. Check that your `SHOPIFY_WEBHOOK_SECRET` matches the one in your Shopify admin
4. Look at the server logs for any errors
5. Test the endpoints using the GET method (e.g., visit `/api/webhooks/inventory`) to verify they're responding

## Production Deployment

When deploying to production:

1. Update the webhook URLs in Shopify to point to your production domain
2. Ensure your environment variables are set correctly in your hosting platform
3. Test the webhooks after deployment by performing actions in Shopify 