import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's credentials from Redis
    const userCredKey = `user_credentials:${userId}`;
    const credentialsData = await redis.get(userCredKey);
    
    let credentials = [];
    if (credentialsData) {
      credentials = JSON.parse(credentialsData);
    }

    return NextResponse.json({
      success: true,
      credentials: credentials.map((cred: any) => ({
        credentialID: cred.credentialID,
        deviceName: cred.deviceName || 'Biometric Device',
        createdAt: cred.createdAt,
        lastUsed: cred.lastUsed
      }))
    });
  } catch (error: any) {
    console.error('Get credentials error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve credentials' },
      { status: 500 }
    );
  }
}