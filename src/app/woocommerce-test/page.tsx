import React from 'react';
import AuthForm from '@/components/auth/AuthForm';

export default function WooCommerceTestPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">WooCommerce Authentication Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Login Form</h2>
          <AuthForm mode="login" redirectUrl="/woocommerce-test/success" />
        </div>
        
        <div className="bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Register Form</h2>
          <AuthForm mode="register" redirectUrl="/woocommerce-test/success" />
        </div>
      </div>
      
      <div className="mt-12 bg-gray-50 p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Note</h2>
        <p>This page is used to test the authentication with WooCommerce using client-safe auth functions.</p>
        <p className="mt-2">After successful login or registration, you will be redirected to the success page.</p>
      </div>
    </div>
  );
} 