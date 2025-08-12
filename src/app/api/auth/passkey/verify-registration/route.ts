import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, attestation } = body;

    if (!userId || !attestation) {
      return NextResponse.json(
        { success: false, message: 'User ID and attestation are required' },
        { status: 400 }
      );
    }

    // Get challenge from Redis
    const challengeKey = `webauthn_challenge:${userId}:registration`;
    const challengeDataStr = await redis.get(challengeKey);

    if (!challengeDataStr) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired challenge' },
        { status: 400 }
      );
    }

    const challengeData = JSON.parse(challengeDataStr);

    try {
      const verification = await verifyRegistrationResponse({
        response: attestation,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: process.env.ORIGIN!,
        expectedRPID: process.env.RP_ID!,
        requireUserVerification: true,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

        // Store credential in Redis with user association
        const credentialData = {
          credentialID: Buffer.from(credentialID).toString('base64'),
          credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
          counter,
          userId: challengeData.userId,
          userEmail: challengeData.userEmail,
          createdAt: Date.now(),
          lastUsed: Date.now(),
          deviceName: 'Biometric Device' // Could be made configurable
        };

        // Store credential by credentialID for lookup during authentication
        const credKey = `passkey_credential:${credentialData.credentialID}`;
        await redis.setex(credKey, 86400 * 365, JSON.stringify(credentialData)); // 1 year

        // Store user's credentials list
        const userCredKey = `user_credentials:${challengeData.userId}`;
        const existingCreds = await redis.get(userCredKey);
        const credentials = existingCreds ? JSON.parse(existingCreds) : [];
        credentials.push(credentialData);
        await redis.setex(userCredKey, 86400 * 365, JSON.stringify(credentials)); // 1 year

        // Clean up challenge
        await redis.del(challengeKey);

        console.log('Passkey registered successfully for user:', challengeData.userEmail);

        return NextResponse.json({
          verified: true,
          message: 'Face ID setup complete! You can now sign in with biometrics.'
        });
      } else {
        return NextResponse.json({
          verified: false,
          message: 'Face ID registration failed. Please try again.'
        });
      }
    } catch (verificationError: any) {
      console.error('Passkey verification error:', verificationError);
      return NextResponse.json(
        { verified: false, message: 'Face ID registration failed. Please try again.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Verify registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration verification failed' },
      { status: 500 }
    );
  }
}