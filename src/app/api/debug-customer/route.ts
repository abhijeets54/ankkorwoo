import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';

/**
 * Debug endpoint to check customer ID extraction from JWT
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('woo_auth_token');

    if (!authCookie || !authCookie.value) {
      return NextResponse.json({
        authenticated: false,
        message: 'No auth token found'
      });
    }

    // Decode the token to see its structure
    const decodedToken = jwtDecode<any>(authCookie.value);

    // Try different paths where customer ID might be
    const possibleCustomerIds = {
      'data.user.id': decodedToken?.data?.user?.id,
      'user_id': decodedToken?.user_id,
      'sub': decodedToken?.sub,
      'userId': decodedToken?.userId,
      'id': decodedToken?.id,
      'data.customer.databaseId': decodedToken?.data?.customer?.databaseId,
    };

    return NextResponse.json({
      authenticated: true,
      tokenStructure: decodedToken,
      possibleCustomerIds,
      message: 'Check the token structure above to find where customer ID is located'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: true,
      message: error.message
    }, { status: 500 });
  }
}
