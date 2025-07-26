'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/clientAuth';

export default function AuthSuccessPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadUser();
  }, []);
  
  return (
    <div className="container mx-auto py-12">
      <div className="max-w-md mx-auto bg-white p-8 border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center">Authentication Successful</h1>
        
        {loading ? (
          <p className="text-center">Loading user data...</p>
        ) : user ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 text-green-700">
              <p className="font-medium">Successfully authenticated!</p>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-medium">User Information</h2>
              <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700">
            <p>No user data found. Authentication may have failed.</p>
          </div>
        )}
        
        <div className="mt-8 flex justify-center">
          <Link href="/test-auth" className="bg-[#2c2c27] text-white py-2 px-4 hover:bg-[#3c3c37]">
            Back to Test Page
          </Link>
        </div>
      </div>
    </div>
  );
} 