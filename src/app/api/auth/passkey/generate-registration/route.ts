import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userEmail, userName } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, message: 'User ID and email are required' },
        { status: 400 }
      );
    }

    const options = await generateRegistrationOptions({
      rpName: process.env.RP_NAME!,
      rpID: process.env.RP_ID!,
      userID: userId,
      userName: userEmail,
      userDisplayName: userName || userEmail,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: [], // TODO: get existing credentials for this user
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });

    // Store challenge temporarily in Redis with 5 minute expiration
    const challengeKey = `webauthn_challenge:${userId}:registration`;
    await redis.setex(challengeKey, 300, JSON.stringify({
      challenge: options.challenge,
      type: 'registration',
      userId,
      userEmail,
      timestamp: Date.now()
    }));

    console.log('Registration challenge generated for user:', userEmail);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('Generate registration challenge error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate registration challenge' },
      { status: 500 }
    );
  }
}