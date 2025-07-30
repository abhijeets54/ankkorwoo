import { NextRequest, NextResponse } from 'next/server';
import { 
  createStockReservation, 
  checkAvailableStock, 
  getUserActiveReservations,
  confirmReservation,
  releaseReservation,
  cleanupExpiredReservations
} from '@/lib/stockReservation';

// POST - Create a new stock reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, userId, variationId, cartId, action } = body;

    // Handle different actions
    switch (action) {
      case 'create':
        if (!productId || !quantity || !userId) {
          return NextResponse.json(
            { error: 'Missing required fields: productId, quantity, userId' },
            { status: 400 }
          );
        }

        const result = await createStockReservation(
          productId,
          parseInt(quantity),
          userId,
          variationId,
          cartId
        );

        if (result.success) {
          return NextResponse.json({
            success: true,
            reservation: result.reservation,
            message: `Reserved ${quantity} items for ${15} minutes`
          });
        } else {
          return NextResponse.json(
            { error: result.error, availableStock: result.availableStock },
            { status: 400 }
          );
        }

      case 'confirm':
        if (!body.reservationId) {
          return NextResponse.json(
            { error: 'Missing reservationId' },
            { status: 400 }
          );
        }

        const confirmed = await confirmReservation(body.reservationId);
        return NextResponse.json({
          success: confirmed,
          message: confirmed ? 'Reservation confirmed' : 'Failed to confirm reservation'
        });

      case 'release':
        if (!body.reservationId) {
          return NextResponse.json(
            { error: 'Missing reservationId' },
            { status: 400 }
          );
        }

        const released = await releaseReservation(body.reservationId);
        return NextResponse.json({
          success: released,
          message: released ? 'Reservation released' : 'Failed to release reservation'
        });

      case 'cleanup':
        const cleanedUp = await cleanupExpiredReservations();
        return NextResponse.json({
          success: true,
          cleanedUp,
          message: `Cleaned up ${cleanedUp} expired reservations`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, confirm, release, or cleanup' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in reservations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user reservations or check stock availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');
    const variationId = searchParams.get('variationId');

    switch (action) {
      case 'user_reservations':
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing userId parameter' },
            { status: 400 }
          );
        }

        const reservations = await getUserActiveReservations(userId);
        return NextResponse.json({
          success: true,
          reservations,
          count: reservations.length
        });

      case 'check_stock':
        if (!productId) {
          return NextResponse.json(
            { error: 'Missing productId parameter' },
            { status: 400 }
          );
        }

        const stockCheck = await checkAvailableStock(productId, variationId || undefined);
        return NextResponse.json({
          success: stockCheck.success,
          availableStock: stockCheck.availableStock,
          totalStock: stockCheck.totalStock,
          reservedStock: stockCheck.reservedStock
        });

      default:
        return NextResponse.json({
          message: 'Stock Reservation API',
          endpoints: {
            'POST /api/reservations': {
              actions: ['create', 'confirm', 'release', 'cleanup'],
              description: 'Manage stock reservations'
            },
            'GET /api/reservations?action=user_reservations&userId=X': 'Get user reservations',
            'GET /api/reservations?action=check_stock&productId=X': 'Check available stock'
          }
        });
    }

  } catch (error) {
    console.error('Error in reservations GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Release specific reservation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing reservationId parameter' },
        { status: 400 }
      );
    }

    const released = await releaseReservation(reservationId);
    return NextResponse.json({
      success: released,
      message: released ? 'Reservation released' : 'Failed to release reservation'
    });

  } catch (error) {
    console.error('Error in reservations DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
