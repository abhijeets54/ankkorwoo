'use client';

import React, { useState, useEffect } from 'react';

export default function TestWooCommercePage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runTests = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🧪 Starting WooCommerce tests...');

        // Import the test function
        const { testWooCommerceConnection, getAllCategories, getCategoryProducts } = await import('@/lib/woocommerce');

        // Test basic connection
        console.log('🔗 Testing basic connection...');
        const connectionTest = await testWooCommerceConnection();
        console.log('Connection test result:', connectionTest);

        // Test categories specifically
        console.log('📂 Testing categories...');
        const categories = await getAllCategories(20);
        console.log('Categories result:', categories);

        // Test specific category queries
        console.log('👔 Testing shirts category...');
        const shirtsCategory = await getCategoryProducts('shirts', { first: 10 });
        console.log('Shirts category result:', shirtsCategory);

        // Test alternative category names
        const alternativeTests = [];
        const alternativeNames = ['shirt', 'Shirts', 'clothing', 'apparel'];
        
        for (const name of alternativeNames) {
          console.log(`🔍 Testing category: ${name}`);
          try {
            const result = await getCategoryProducts(name, { first: 5 });
            alternativeTests.push({
              name,
              success: !!result?.products?.nodes?.length,
              productCount: result?.products?.nodes?.length || 0,
              result: result
            });
          } catch (err) {
            alternativeTests.push({
              name,
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        }

        setTestResults({
          connectionTest,
          categories: categories?.slice(0, 10), // Show first 10 categories
          categoriesCount: categories?.length || 0,
          shirtsCategory,
          alternativeTests,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        console.error('❌ Test failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    runTests();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Testing WooCommerce connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-red-600 mb-6">WooCommerce Test Failed</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">WooCommerce Connection Test Results</h1>
        
        {/* Connection Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🔗 Connection Test</h2>
          <div className="bg-gray-50 rounded p-4">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResults?.connectionTest, null, 2)}
            </pre>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📂 Categories ({testResults?.categoriesCount || 0} total)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testResults?.categories?.map((category: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded p-3">
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-600">Slug: {category.slug}</p>
                <p className="text-sm text-gray-600">Count: {category.count || 0}</p>
                <p className="text-sm text-gray-600">ID: {category.id}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shirts Category Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">👔 Shirts Category Test</h2>
          <div className="bg-gray-50 rounded p-4">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResults?.shirtsCategory, null, 2)}
            </pre>
          </div>
        </div>

        {/* Alternative Category Tests */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🔍 Alternative Category Tests</h2>
          <div className="space-y-4">
            {testResults?.alternativeTests?.map((test: any, index: number) => (
              <div key={index} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Category: "{test.name}"</h3>
                  <span className={`px-2 py-1 rounded text-sm ${
                    test.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {test.success ? `✅ ${test.productCount} products` : '❌ Failed'}
                  </span>
                </div>
                {test.error && (
                  <p className="text-red-600 text-sm">{test.error}</p>
                )}
                {test.result && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600">View raw result</summary>
                    <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto">
                      {JSON.stringify(test.result, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Raw Test Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Raw Test Results</h2>
          <div className="bg-gray-50 rounded p-4">
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
