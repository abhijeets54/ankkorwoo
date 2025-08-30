import crypto from 'crypto';

export interface WebhookVerificationResult {
  verified: boolean;
  error?: string;
}

export class WebhookSecurityService {
  private readonly secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.WOOCOMMERCE_WEBHOOK_SECRET || '';
    
    if (!this.secret) {
      console.error('WOOCOMMERCE_WEBHOOK_SECRET environment variable is not set!');
    }
  }

  /**
   * Verify webhook signature using multiple methods to support different WooCommerce versions
   */
  verifySignature(payload: string, receivedSignature: string): WebhookVerificationResult {
    if (!this.secret) {
      return {
        verified: false,
        error: 'Webhook secret not configured'
      };
    }

    if (!receivedSignature) {
      return {
        verified: false,
        error: 'No signature provided in webhook request'
      };
    }

    try {
      // Clean the received signature (remove any whitespace)
      const cleanSignature = receivedSignature.trim();

      // Method 1: Standard base64 HMAC-SHA256 (most common)
      const expectedBase64 = crypto
        .createHmac('sha256', this.secret)
        .update(payload, 'utf8')
        .digest('base64');

      // Method 2: Hex HMAC-SHA256 (some versions use this)
      const expectedHex = crypto
        .createHmac('sha256', this.secret)
        .update(payload, 'utf8')
        .digest('hex');

      // Method 3: With "sha256=" prefix (GitHub/GitLab style)
      const expectedWithPrefix = 'sha256=' + expectedBase64;
      const expectedHexWithPrefix = 'sha256=' + expectedHex;

      // Method 4: WordPress/WooCommerce specific format
      const expectedWpHash = crypto
        .createHash('sha256')
        .update(payload + this.secret)
        .digest('hex');

      // Test all possible signature formats
      const validSignatures = [
        expectedBase64,
        expectedHex,
        expectedWithPrefix,
        expectedHexWithPrefix,
        expectedWpHash
      ];

      // Use timing-safe comparison to prevent timing attacks
      for (const expectedSignature of validSignatures) {
        if (this.timingSafeEqual(cleanSignature, expectedSignature)) {
          return { verified: true };
        }
      }

      // Log for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Signature verification failed:', {
          received: cleanSignature,
          receivedLength: cleanSignature.length,
          expectedBase64,
          expectedHex,
          expectedWithPrefix,
          expectedHexWithPrefix,
          expectedWpHash,
          payloadLength: payload.length,
          payloadPreview: payload.substring(0, 100),
          secretLength: this.secret.length
        });
      }

      return {
        verified: false,
        error: 'Invalid signature - webhook authentication failed'
      };

    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return {
        verified: false,
        error: 'Signature verification error'
      };
    }
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEqual(received: string, expected: string): boolean {
    try {
      // Convert strings to buffers for constant-time comparison
      const receivedBuffer = Buffer.from(received, 'utf8');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      
      // If lengths don't match, still do comparison to prevent timing attacks
      if (receivedBuffer.length !== expectedBuffer.length) {
        // Perform a dummy comparison with fixed-length buffers
        const maxLength = Math.max(receivedBuffer.length, expectedBuffer.length);
        const dummyReceived = Buffer.alloc(maxLength);
        const dummyExpected = Buffer.alloc(maxLength);
        
        receivedBuffer.copy(dummyReceived);
        expectedBuffer.copy(dummyExpected);
        
        crypto.timingSafeEqual(dummyReceived, dummyExpected);
        return false;
      }

      return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    } catch (error) {
      // If timingSafeEqual fails, fall back to length check + dummy operation
      console.error('Timing-safe comparison failed:', error);
      
      // Still perform some operation to maintain consistent timing
      crypto.createHash('sha256').update(received + expected).digest('hex');
      return false;
    }
  }

  /**
   * Generate signature for testing purposes
   */
  generateSignature(payload: string, format: 'base64' | 'hex' | 'prefixed' = 'base64'): string {
    if (!this.secret) {
      throw new Error('Webhook secret not configured');
    }

    const hmac = crypto.createHmac('sha256', this.secret);
    
    switch (format) {
      case 'base64':
        return hmac.update(payload, 'utf8').digest('base64');
      case 'hex':
        return hmac.update(payload, 'utf8').digest('hex');
      case 'prefixed':
        return 'sha256=' + hmac.update(payload, 'utf8').digest('base64');
      default:
        return hmac.update(payload, 'utf8').digest('base64');
    }
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   */
  validateTimestamp(
    timestampHeader: string | null, 
    toleranceMs: number = 5 * 60 * 1000 // 5 minutes default
  ): boolean {
    if (!timestampHeader) {
      console.warn('No timestamp header found in webhook');
      return false;
    }

    try {
      const webhookTimestamp = parseInt(timestampHeader, 10) * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeDifference = Math.abs(now - webhookTimestamp);

      if (timeDifference > toleranceMs) {
        console.warn(`Webhook timestamp too old: ${timeDifference}ms difference`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating webhook timestamp:', error);
      return false;
    }
  }

  /**
   * Rate limiting for webhook endpoints
   */
  private static webhookRequestCounts = new Map<string, { count: number; windowStart: number }>();

  checkRateLimit(
    identifier: string, 
    maxRequests: number = 100, 
    windowMs: number = 60 * 1000 // 1 minute window
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const current = WebhookSecurityService.webhookRequestCounts.get(identifier);

    if (!current || (now - current.windowStart) > windowMs) {
      // New window or first request
      WebhookSecurityService.webhookRequestCounts.set(identifier, {
        count: 1,
        windowStart: now
      });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    // Within the same window
    current.count++;
    WebhookSecurityService.webhookRequestCounts.set(identifier, current);

    return {
      allowed: current.count <= maxRequests,
      remaining: Math.max(0, maxRequests - current.count),
      resetTime: current.windowStart + windowMs
    };
  }

  /**
   * Clean up old rate limit entries
   */
  static cleanupRateLimitEntries(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    for (const [key, value] of WebhookSecurityService.webhookRequestCounts) {
      if (value.windowStart < oneHourAgo) {
        WebhookSecurityService.webhookRequestCounts.delete(key);
      }
    }
  }
}

// Singleton instance for webhook security
export const webhookSecurity = new WebhookSecurityService();