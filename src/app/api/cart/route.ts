import { NextRequest, NextResponse } from 'next/server';
import { CartService } from '@/services/CartService';
import { StockReservationService } from '@/services/StockReservationService';
import { 
  withAppRouterErrorHandling, 
  ValidationError, 
  NotFoundError,
  StockError,
  safeAsync
} from '@/lib/errorHandling';
import { z } from 'zod';

// Input validation schemas
const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variationId: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be a positive integer').max(100, 'Maximum quantity is 100'),
  price: z.number().positive('Price must be positive'),
  name: z.string().min(1, 'Product name is required'),
  imageUrl: z.string().url().optional(),
  attributes: z.record(z.any()).optional(),
});

const updateCartItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative').max(100, 'Maximum quantity is 100'),
});

const initCartSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

// Services
const cartService = new CartService();
const stockService = new StockReservationService();

// GET - Get cart details
export const GET = withAppRouterErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const cartId = searchParams.get('cartId');
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');

  if (!cartId && !userId && !sessionId) {
    throw new ValidationError('Either cartId, userId, or sessionId must be provided');
  }

  const { data: cart, error } = await safeAsync(async () => {
    if (cartId) {
      return await cartService.getCartWithItems(cartId);
    } else {
      return await cartService.getOrCreateCart(userId, sessionId);
    }
  }, { operation: 'get_cart', cartId, userId, sessionId });

  if (error) {
    throw error;
  }

  if (!cart) {
    throw new NotFoundError('Cart');
  }

  // Get cart statistics
  const { data: stats } = await safeAsync(async () => {
    return await cartService.getCartStats(cart.id);
  }, { operation: 'get_cart_stats', cartId: cart.id });

  return NextResponse.json({
    success: true,
    cart: {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      status: cart.status,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        price: Number(item.price),
        name: item.name,
        imageUrl: item.imageUrl,
        attributes: item.attributes,
        reservationId: item.reservationId,
        createdAt: item.createdAt
      }))
    },
    stats: stats || { itemCount: 0, subtotal: 0, uniqueProducts: 0 }
  });
});

// POST - Add item to cart or create cart
export const POST = withAppRouterErrorHandling(async (request: NextRequest) => {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }

  const action = body.action;
  
  if (!action) {
    throw new ValidationError('Action is required');
  }

  try {
    switch (action) {
      case 'create_cart':
        return await handleCreateCart(body);
      case 'add_item':
        return await handleAddItem(body);
      case 'merge_guest_cart':
        return await handleMergeGuestCart(body);
      default:
        throw new ValidationError('Invalid action. Supported actions: create_cart, add_item, merge_guest_cart');
    }
  } catch (error) {
    // Convert Zod validation errors to ValidationError
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Validation failed: ${messages}`);
    }
    throw error;
  }
});

// PUT - Update cart item
export const PUT = withAppRouterErrorHandling(async (request: NextRequest) => {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }
  
  let validatedData;
  try {
    validatedData = updateCartItemSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Validation failed: ${messages}`);
    }
    throw error;
  }
  
  const { data: updatedItem, error } = await safeAsync(async () => {
    return await cartService.updateCartItemQuantity(
      validatedData.itemId, 
      validatedData.quantity
    );
  }, { 
    operation: 'update_cart_item',
    itemId: validatedData.itemId,
    quantity: validatedData.quantity 
  });

  if (error) {
    throw error;
  }

  if (!updatedItem) {
    // Item was removed due to 0 quantity
    return NextResponse.json({
      success: true,
      message: 'Cart item removed',
      item: null
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Cart item updated successfully',
    item: {
      id: updatedItem.id,
      productId: updatedItem.productId,
      variationId: updatedItem.variationId,
      quantity: updatedItem.quantity,
      price: Number(updatedItem.price),
      name: updatedItem.name,
      updatedAt: updatedItem.updatedAt
    }
  });
});

// DELETE - Remove cart item or clear cart
export const DELETE = withAppRouterErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  const cartId = searchParams.get('cartId');
  const clearAll = searchParams.get('clearAll') === 'true';

  if (clearAll && cartId) {
    // Clear entire cart
    const { error } = await safeAsync(async () => {
      await cartService.clearCart(cartId);
    }, { operation: 'clear_cart', cartId });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } else if (itemId) {
    // Remove specific item
    const { error } = await safeAsync(async () => {
      await cartService.removeCartItem(itemId);
    }, { operation: 'remove_cart_item', itemId });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Cart item removed successfully'
    });
  } else {
    throw new ValidationError('Either itemId or cartId with clearAll=true must be provided');
  }
});

// Helper functions
async function handleCreateCart(body: any) {
  let validatedData;
  try {
    validatedData = initCartSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Cart creation validation failed: ${messages}`);
    }
    throw error;
  }
  
  if (!validatedData.userId && !validatedData.sessionId) {
    throw new ValidationError('Either userId or sessionId must be provided');
  }

  const { data: cart, error } = await safeAsync(async () => {
    return await cartService.getOrCreateCart(
      validatedData.userId, 
      validatedData.sessionId
    );
  }, { 
    operation: 'create_cart',
    userId: validatedData.userId,
    sessionId: validatedData.sessionId 
  });

  if (error) {
    throw error;
  }

  return NextResponse.json({
    success: true,
    message: 'Cart created successfully',
    cart: {
      id: cart!.id,
      userId: cart!.userId,
      sessionId: cart!.sessionId,
      status: cart!.status,
      createdAt: cart!.createdAt,
      items: cart!.items
    }
  });
}

async function handleAddItem(body: any) {
  const cartId = body.cartId;
  if (!cartId) {
    throw new ValidationError('Cart ID is required');
  }

  if (!body.item) {
    throw new ValidationError('Item data is required');
  }

  let validatedData;
  try {
    validatedData = addToCartSchema.parse(body.item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(`Item validation failed: ${messages}`);
    }
    throw error;
  }
  
  // Check stock availability first
  const { data: stockResult, error: stockError } = await safeAsync(async () => {
    return await stockService.checkAvailableStock(
      validatedData.productId,
      validatedData.variationId
    );
  }, { 
    operation: 'check_stock',
    productId: validatedData.productId,
    variationId: validatedData.variationId 
  });

  if (stockError) {
    throw stockError;
  }

  if (!stockResult?.success || stockResult.availableStock < validatedData.quantity) {
    throw new StockError(
      `Insufficient stock available. Requested: ${validatedData.quantity}, Available: ${stockResult?.availableStock || 0}`,
      stockResult?.availableStock || 0,
      validatedData.quantity
    );
  }

  // Create stock reservation
  let reservationId: string | undefined;
  const { data: reservationResult } = await safeAsync(async () => {
    return await stockService.createReservation(
      validatedData.productId,
      validatedData.quantity,
      body.userId,
      body.sessionId,
      validatedData.variationId
    );
  }, { 
    operation: 'create_reservation',
    productId: validatedData.productId,
    quantity: validatedData.quantity 
  });

  if (reservationResult?.success && reservationResult.reservation) {
    reservationId = reservationResult.reservation.id;
  }

  // Add item to cart
  const { data: cartItem, error: cartError } = await safeAsync(async () => {
    return await cartService.addToCart(cartId, {
      productId: validatedData.productId,
      variationId: validatedData.variationId,
      quantity: validatedData.quantity,
      price: validatedData.price,
      name: validatedData.name,
      imageUrl: validatedData.imageUrl,
      attributes: validatedData.attributes
    }, reservationId);
  }, { 
    operation: 'add_to_cart',
    cartId,
    productId: validatedData.productId 
  });

  if (cartError) {
    // Release reservation if cart addition failed
    if (reservationId) {
      await safeAsync(async () => {
        await stockService.releaseReservation(reservationId!);
      });
    }
    throw cartError;
  }

  return NextResponse.json({
    success: true,
    message: 'Item added to cart successfully',
    item: {
      id: cartItem!.id,
      productId: cartItem!.productId,
      variationId: cartItem!.variationId,
      quantity: cartItem!.quantity,
      price: Number(cartItem!.price),
      name: cartItem!.name,
      reservationId: cartItem!.reservationId,
      createdAt: cartItem!.createdAt
    },
    reservation: reservationId ? {
      id: reservationId,
      expiresAt: reservationResult?.reservation?.expiresAt
    } : undefined
  });
}

async function handleMergeGuestCart(body: any) {
  const { sessionId, userId } = body;
  
  if (!sessionId || !userId) {
    throw new ValidationError('Both sessionId and userId are required for cart merging');
  }

  const { data: mergedCart, error } = await safeAsync(async () => {
    return await cartService.mergeGuestCartWithUserCart(sessionId, userId);
  }, { operation: 'merge_guest_cart', sessionId, userId });

  if (error) {
    throw error;
  }

  return NextResponse.json({
    success: true,
    message: 'Guest cart merged successfully',
    cart: {
      id: mergedCart!.id,
      userId: mergedCart!.userId,
      items: mergedCart!.items.map(item => ({
        id: item.id,
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        price: Number(item.price),
        name: item.name,
        reservationId: item.reservationId
      }))
    }
  });
}