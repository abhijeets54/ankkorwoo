'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';

interface FaceIDSetupProps {
  userId: string;
  userEmail: string;
  userName?: string;
  onSuccess?: () => void;
  onSkip?: () => void;
  isOptional?: boolean;
}

const FaceIDSetup: React.FC<FaceIDSetupProps> = ({
  userId,
  userEmail,
  userName,
  onSuccess,
  onSkip,
  isOptional = true
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetupFaceID = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setStatus('error');
        setMessage('Face ID is not supported on this device or browser.');
        return;
      }

      // Generate registration options
      const response = await fetch('/api/auth/passkey/generate-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail,
          userName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate registration challenge');
      }

      const options = await response.json();

      // Start registration process
      const attResp = await startRegistration(options);

      // Verify registration
      const verificationResponse = await fetch('/api/auth/passkey/verify-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          attestation: attResp,
        }),
      });

      const verification = await verificationResponse.json();

      if (verification.verified) {
        setStatus('success');
        setMessage(verification.message || 'Face ID setup complete!');
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setStatus('error');
        setMessage(verification.message || 'Face ID setup failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Face ID setup error:', error);
      setStatus('error');
      
      if (error.name === 'NotAllowedError') {
        setMessage('Face ID setup was cancelled or not allowed.');
      } else if (error.name === 'NotSupportedError') {
        setMessage('Face ID is not supported on this device.');
      } else {
        setMessage('Face ID setup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 p-6"
      >
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">Face ID Setup Complete!</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </motion.div>
    );
  }

  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 p-6"
      >
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">Setup Failed</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleSetupFaceID}
            className="w-full bg-[#2c2c27] text-white py-2 px-4 rounded-lg hover:bg-[#3d3d35] transition-colors"
          >
            Try Again
          </button>
          {isOptional && (
            <button
              onClick={onSkip}
              className="w-full text-[#2c2c27] hover:text-[#3d3d35] py-2 font-medium underline"
            >
              Skip for Now
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6 p-6"
    >
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#2c2c27] to-[#3d3d35] rounded-full flex items-center justify-center">
          <Fingerprint className="h-10 w-10 text-white" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900">Set Up Face ID</h3>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">
            Enable Face ID for quick and secure sign-in. Your biometric data stays on your device.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <h4 className="font-medium text-blue-900 mb-2">🔒 Privacy & Security</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your biometric data never leaves your device</li>
            <li>• Uses industry-standard WebAuthn protocol</li>
            <li>• More secure than passwords</li>
            <li>• Works with Face ID, Touch ID, or Windows Hello</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSetupFaceID}
          disabled={isLoading}
          className="w-full bg-[#2c2c27] text-white py-3 px-4 rounded-lg hover:bg-[#3d3d35] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Setting up Face ID...
            </span>
          ) : (
            'Enable Face ID'
          )}
        </button>

        {isOptional && (
          <button
            onClick={onSkip}
            disabled={isLoading}
            className="w-full text-[#2c2c27] hover:text-[#3d3d35] py-2 font-medium underline disabled:text-gray-400"
          >
            Skip for Now
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default FaceIDSetup;