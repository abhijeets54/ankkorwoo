'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Loader2, AlertCircle } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

interface FaceIDSignInProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

const FaceIDSignIn: React.FC<FaceIDSignInProps> = ({ onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFaceIDSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('Face ID is not supported on this device or browser.');
      }

      // Generate authentication options
      const response = await fetch('/api/auth/passkey/generate-authentication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to generate authentication challenge');
      }

      const options = await response.json();

      // Start authentication process
      const authResp = await startAuthentication(options);

      // Verify authentication
      const verificationResponse = await fetch('/api/auth/passkey/verify-authentication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assertion: authResp,
        }),
      });

      const verification = await verificationResponse.json();

      if (verification.verified) {
        console.log('Face ID authentication successful');
        onSuccess?.(verification.user);
      } else {
        const errorMsg = verification.message || 'Face ID authentication failed. Please try again.';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (error: any) {
      console.error('Face ID authentication error:', error);
      
      let errorMessage = 'Face ID authentication failed. Please try again.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Face ID authentication was cancelled.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Face ID is not supported on this device.';
      } else if (error.message.includes('Invalid credential')) {
        errorMessage = 'Face ID not set up. Please sign in with password first.';
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#2c2c27] to-[#3d3d35] rounded-full flex items-center justify-center mb-4">
          <Fingerprint className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in with Face ID</h3>
        <p className="text-sm text-gray-600">
          Use your biometric authentication for quick and secure access
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded-lg flex items-start"
        >
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      <button
        onClick={handleFaceIDSignIn}
        disabled={isLoading}
        className="w-full bg-[#2c2c27] text-white py-3 px-4 rounded-lg hover:bg-[#3d3d35] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Authenticating...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <Fingerprint className="mr-2 h-4 w-4" />
            Use Face ID
          </span>
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Face ID uses your device's biometric authentication
        </p>
      </div>
    </div>
  );
};

export default FaceIDSignIn;