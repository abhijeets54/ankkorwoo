import React from 'react';
import AuthForm from '@/components/auth/AuthForm';

export default function TestAuthPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">WooCommerce Authentication Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Login Form</h2>
          <AuthForm mode="login" redirectUrl="/test-auth/success" />
        </div>
        
        <div className="bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Register Form</h2>
          <AuthForm mode="register" redirectUrl="/test-auth/success" />
        </div>
      </div>
      
      <div className="mt-12 bg-gray-50 p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Note</h2>
        <p>This page is used to test the WooCommerce authentication with Next.js 14's Server Components architecture.</p>
        <p className="mt-2">We've separated the client and server authentication logic to make it work with Next.js 14.</p>
      </div>
    </div>
  );
} 