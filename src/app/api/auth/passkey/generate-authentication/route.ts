import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID!,
      userVerification: 'required',
      // Don't specify allowCredentials to use resident keys (passwordless)
    });

    // Store challenge temporarily in Redis with 5 minute expiration
    // Use a general key since we don't know user ID yet during passwordless login
    const challengeKey = `webauthn_challenge:auth:${options.challenge}`;
    await redis.setex(challengeKey, 300, JSON.stringify({
      challenge: options.challenge,
      type: 'authentication',
      userEmail: userEmail || null,
      timestamp: Date.now()
    }));

    console.log('Authentication challenge generated');

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('Generate authentication challenge error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate authentication challenge' },
      { status: 500 }
    );
  }
}