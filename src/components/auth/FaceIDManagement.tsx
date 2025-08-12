'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Trash2, Plus, Shield, Clock, Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FaceIDSetup from './FaceIDSetup';

interface Credential {
  credentialID: string;
  deviceName: string;
  createdAt: number;
  lastUsed: number;
}

interface FaceIDManagementProps {
  userId: string;
  userEmail: string;
  userName?: string;
}

const FaceIDManagement: React.FC<FaceIDManagementProps> = ({
  userId,
  userEmail,
  userName
}) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [deletingCredential, setDeletingCredential] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, [userId]);

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, you'd fetch credentials from your API
      // For now, we'll simulate loading from Redis
      const response = await fetch('/api/auth/passkey/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCredential = async (credentialID: string) => {
    setDeletingCredential(credentialID);
    try {
      const response = await fetch('/api/auth/passkey/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialID }),
      });

      if (response.ok) {
        setCredentials(prev => prev.filter(cred => cred.credentialID !== credentialID));
      }
    } catch (error) {
      console.error('Failed to delete credential:', error);
    } finally {
      setDeletingCredential(null);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    loadCredentials();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (showSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Fingerprint className="mr-2 h-5 w-5" />
            Add Face ID Device
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FaceIDSetup
            userId={userId}
            userEmail={userEmail}
            userName={userName}
            onSuccess={handleSetupComplete}
            onSkip={() => setShowSetup(false)}
            isOptional={true}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Fingerprint className="mr-2 h-5 w-5" />
          Face ID & Security
        </CardTitle>
        <CardDescription>
          Manage your biometric authentication devices for secure, passwordless sign-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Enhanced Security</h4>
              <p className="text-sm text-blue-800">
                Face ID uses your device's secure biometric authentication. Your biometric data never leaves your device and provides stronger security than passwords.
              </p>
            </div>
          </div>
        </div>

        {/* Registered Devices */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Registered Devices</h3>
            <Button 
              onClick={() => setShowSetup(true)}
              className="bg-[#2c2c27] hover:bg-[#3d3d35]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading devices...</span>
            </div>
          ) : credentials.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg"
            >
              <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No devices registered</h3>
              <p className="text-gray-600 mb-4">
                Set up Face ID to enable secure, passwordless sign-in
              </p>
              <Button 
                onClick={() => setShowSetup(true)}
                className="bg-[#2c2c27] hover:bg-[#3d3d35]"
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                Set Up Face ID
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {credentials.map((credential) => (
                  <motion.div
                    key={credential.credentialID}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                          <Fingerprint className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{credential.deviceName}</h4>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>Added {formatDate(credential.createdAt)}</span>
                            <span className="mx-2">•</span>
                            <span>Last used {formatRelativeTime(credential.lastUsed)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCredential(credential.credentialID)}
                        disabled={deletingCredential === credential.credentialID}
                      >
                        {deletingCredential === credential.credentialID ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Additional Security Info */}
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">How Face ID Works</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              <span>Uses your device's built-in biometric authentication (Face ID, Touch ID, Windows Hello)</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              <span>Your biometric data never leaves your device</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              <span>More secure than passwords - no risk of being stolen or guessed</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              <span>Works across all your devices with the same biometric method</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FaceIDManagement;