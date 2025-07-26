import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

// Raw body parser helper function
const getRawBody = async (request: NextRequest): Promise<Buffer> => {
  const blob = await request.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body for signature validation
    const rawBody = await getRawBody(request);
    const bodyText = rawBody.toString('utf8');
    
    // Get data from request headers
    const signature = request.headers.get('x-wc-webhook-signature');
    const topic = request.headers.get('x-wc-webhook-topic') || '';
    const event = request.headers.get('x-wc-webhook-event') || '';
    const source = request.headers.get('x-wc-webhook-source');
    
    // Validate webhook signature
    if (signature) {
      const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || '';
      const generatedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyText)
        .digest('base64');
        
      // If signatures don't match, return 401 Unauthorized
      if (generatedHash !== signature) {
        console.error('Signature validation failed - Webhook security compromised');
        return NextResponse.json(
          { error: 'Signature validation failed' },
          { status: 401 }
        );
      }
    } else {
      // If no signature header, return 401 Unauthorized
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }
    
    // Parse the body to JSON
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    console.log(`Received WooCommerce webhook: ${topic} - ${event} from ${source}`);
    
    // Handle different webhook topics
    switch (topic) {
      case 'product.updated':
        console.log('Processing product update', body.id);
        
        // Revalidate product and collection pages
        revalidatePath(`/product/${body.slug}`);
        revalidatePath('/collection');
        revalidatePath('/');
        
        // Update Redis cache if needed
        // ...
        
        break;
        
      case 'product.deleted':
        console.log('Processing product deletion', body.id);
        
        // Revalidate collection pages
        revalidatePath('/collection');
        revalidatePath('/');
        
        break;
        
      case 'order.created':
        console.log('Processing new order', body.id);
        
        // Order processing logic here
        // Update inventory if needed
        // Send notifications, etc.
        
        break;
        
      case 'order.updated':
        console.log('Processing order update', body.id);
        
        // Update order status in your system if needed
        
        break;
        
      case 'product_variation.updated':
        console.log('Processing product variation update', body.id);
        
        // Get parent product ID and revalidate
        const parentId = body.parent_id;
        if (parentId) {
          // Fetch the parent product slug and revalidate
          // You might need to implement a function to get the slug by ID
          // For now, we'll just revalidate collections
          revalidatePath('/collection');
          revalidatePath('/');
        }
        
        break;
        
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    return NextResponse.json(
      { success: true, topic, event, processed: Date.now() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint for testing connection
export async function GET() {
  return NextResponse.json(
    { message: 'WooCommerce webhook endpoint active' },
    { status: 200 }
  );
} 