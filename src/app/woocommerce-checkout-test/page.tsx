'use client';

import React, { useState } from 'react';
import { getWooCommerceCheckoutUrl } from '@/lib/woocommerce';

export default function WooCommerceCheckoutTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || '');
  const [cartId, setCartId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [additionalParams, setAdditionalParams] = useState('guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0&create_account=0');
  const [generatedUrl, setGeneratedUrl] = useState('');

  const handleGenerateUrl = () => {
    try {
      // Generate URL using the woocommerce.ts function
      const url = getWooCommerceCheckoutUrl(cartId, isLoggedIn);
      setGeneratedUrl(url);
    } catch (error) {
      console.error('Error generating URL:', error);
      alert('Error generating URL. Check console for details.');
    }
  };

  const handleDirectUrl = () => {
    try {
      // Generate a direct URL with the base URL and additional parameters
      const url = `${baseUrl}/checkout/?${additionalParams}`;
      setGeneratedUrl(url);
    } catch (error) {
      console.error('Error generating direct URL:', error);
      alert('Error generating direct URL. Check console for details.');
    }
  };

  const handleRedirect = () => {
    if (!generatedUrl) {
      alert('Please generate a URL first');
      return;
    }

    setIsLoading(true);
    window.location.href = generatedUrl;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">WooCommerce Checkout Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate Checkout URL</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="https://your-woocommerce-site.com"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Cart ID (optional)</label>
          <input
            type="text"
            value={cartId}
            onChange={(e) => setCartId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="cart123"
          />
        </div>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isLoggedIn}
              onChange={(e) => setIsLoggedIn(e.target.checked)}
              className="mr-2"
            />
            <span>Is User Logged In?</span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            If checked, guest checkout parameters will not be added
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Additional Parameters</label>
          <input
            type="text"
            value={additionalParams}
            onChange={(e) => setAdditionalParams(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="guest_checkout=yes&checkout_woocommerce_checkout_login_reminder=0"
          />
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={handleGenerateUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate Using Library Function
          </button>
          
          <button
            onClick={handleDirectUrl}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Generate Direct URL
          </button>
        </div>
      </div>
      
      {generatedUrl && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Generated URL</h2>
          
          <div className="mb-4 p-3 bg-gray-100 rounded overflow-x-auto">
            <code className="text-sm break-all">{generatedUrl}</code>
          </div>
          
          <button
            onClick={handleRedirect}
            disabled={isLoading}
            className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Redirecting...' : 'Test This URL'}
          </button>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800">Troubleshooting Tips</h3>
        <ul className="list-disc pl-5 mt-2 text-sm">
          <li>If you're redirected to login, check your WooCommerce settings under <strong>WooCommerce &gt; Settings &gt; Accounts &amp; Privacy</strong></li>
          <li>Ensure "Allow customers to place orders without an account" is checked</li>
          <li>Try using an incognito/private browser window to avoid session conflicts</li>
          <li>Check browser console for any errors during redirection</li>
        </ul>
      </div>
    </div>
  );
} 