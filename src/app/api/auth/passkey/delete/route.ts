import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credentialID } = body;

    if (!credentialID) {
      return NextResponse.json(
        { success: false, message: 'Credential ID is required' },
        { status: 400 }
      );
    }

    // Get credential data to find user ID
    const credKey = `passkey_credential:${credentialID}`;
    const credentialData = await redis.get(credKey);

    if (!credentialData) {
      return NextResponse.json(
        { success: false, message: 'Credential not found' },
        { status: 404 }
      );
    }

    const credential = JSON.parse(credentialData);
    const userId = credential.userId;

    // Delete the credential
    await redis.del(credKey);

    // Update user's credentials list
    const userCredKey = `user_credentials:${userId}`;
    const userCredsData = await redis.get(userCredKey);
    
    if (userCredsData) {
      const userCreds = JSON.parse(userCredsData);
      const updatedCreds = userCreds.filter((cred: any) => cred.credentialID !== credentialID);
      
      if (updatedCreds.length > 0) {
        await redis.setex(userCredKey, 86400 * 365, JSON.stringify(updatedCreds)); // 1 year
      } else {
        await redis.del(userCredKey); // Remove the key if no credentials left
      }
    }

    console.log('Credential deleted successfully:', credentialID);

    return NextResponse.json({
      success: true,
      message: 'Face ID device removed successfully'
    });
  } catch (error: any) {
    console.error('Delete credential error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete credential' },
      { status: 500 }
    );
  }
}