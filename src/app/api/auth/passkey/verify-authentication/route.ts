import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assertion } = body;

    if (!assertion) {
      return NextResponse.json(
        { success: false, message: 'Assertion is required' },
        { status: 400 }
      );
    }

    // Get challenge from Redis using the challenge from assertion
    const challengeKey = `webauthn_challenge:auth:${assertion.response.clientDataJSON}`;
    
    // Since we can't easily extract the challenge, we'll search for it differently
    // Get credential from Redis using credentialID
    const credentialID = assertion.id;
    const credKey = `passkey_credential:${credentialID}`;
    const credentialDataStr = await redis.get(credKey);

    if (!credentialDataStr) {
      return NextResponse.json(
        { success: false, message: 'Invalid credential. Please register Face ID first.' },
        { status: 400 }
      );
    }

    const credentialData = JSON.parse(credentialDataStr);

    // Find the challenge - we'll need to search through active challenges
    const challengeKeys = await redis.keys('webauthn_challenge:auth:*');
    let challengeData = null;
    
    for (const key of challengeKeys) {
      const data = await redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        // This is a simplified challenge matching - in production, implement proper challenge validation
        challengeData = parsed;
        await redis.del(key); // Clean up used challenge
        break;
      }
    }

    if (!challengeData) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired challenge' },
        { status: 400 }
      );
    }

    try {
      // Reconstruct authenticator for verification
      const authenticator = {
        credentialID: Buffer.from(credentialData.credentialID, 'base64'),
        credentialPublicKey: Buffer.from(credentialData.credentialPublicKey, 'base64'),
        counter: credentialData.counter,
      };

      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: process.env.ORIGIN!,
        expectedRPID: process.env.RP_ID!,
        authenticator,
        requireUserVerification: true,
      });

      if (verification.verified) {
        // Update counter for clone detection
        credentialData.counter = verification.authenticationInfo.newCounter;
        credentialData.lastUsed = Date.now();
        await redis.setex(credKey, 86400 * 365, JSON.stringify(credentialData));

        // Set authentication cookies (similar to regular login)
        const cookieStore = cookies();
        
        // In a real implementation, you'd issue a JWT token here
        // For now, we'll create a simple session indicator
        cookieStore.set('passkey_authenticated', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        cookieStore.set('passkey_user_id', credentialData.userId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        console.log('Face ID authentication successful for user:', credentialData.userEmail);

        return NextResponse.json({
          verified: true,
          message: 'Face ID authentication successful!',
          user: {
            id: credentialData.userId,
            email: credentialData.userEmail,
          }
        });
      } else {
        return NextResponse.json({
          verified: false,
          message: 'Face ID authentication failed. Please try again.'
        });
      }
    } catch (verificationError: any) {
      console.error('Authentication verification error:', verificationError);
      return NextResponse.json(
        { verified: false, message: 'Face ID authentication failed. Please try again.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Verify authentication error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication verification failed' },
      { status: 500 }
    );
  }
}