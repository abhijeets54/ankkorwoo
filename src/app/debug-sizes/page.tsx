'use client';

import React, { useState, useEffect } from 'react';
import { getAllProducts, getProductBySlug } from '@/lib/woocommerce';
import { SizeAttributeProcessor } from '@/lib/sizeAttributeProcessor';

export default function DebugSizesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndAnalyzeProducts = async () => {
      try {
        setLoading(true);
        console.log('Fetching products for size analysis...');
        
        const allProducts = await getAllProducts(10); // Get first 10 products
        
        if (!allProducts || allProducts.length === 0) {
          setError('No products found');
          return;
        }

        console.log('Raw products from WooCommerce:', allProducts);

        // Analyze each product for size information
        const analyzedProducts = allProducts.map((product: any) => {
          console.log(`Analyzing product: ${product.name}`);
          console.log('Product type:', product.type);
          console.log('Product attributes:', product.attributes);
          console.log('Product variations:', product.variations);

          // Try to extract size information
          const sizeInfo = SizeAttributeProcessor.extractSizeAttributes(product);
          console.log('Extracted size info:', sizeInfo);

          return {
            id: product.id,
            name: product.name,
            type: product.type,
            attributes: product.attributes,
            variations: product.variations,
            sizeInfo: sizeInfo,
            hasVariations: !!(product.variations && product.variations.nodes && product.variations.nodes.length > 0),
            hasAttributes: !!(product.attributes && product.attributes.nodes && product.attributes.nodes.length > 0)
          };
        });

        setProducts(analyzedProducts);
        console.log('Analyzed products:', analyzedProducts);

      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyzeProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing products for size information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-red-600 mb-6">Size Analysis Failed</h1>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Product Size Analysis</h1>
        
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Setup Instructions</h2>
          <p className="text-yellow-700 text-sm mb-2">
            If no products show size information, you need to set up variable products in WooCommerce:
          </p>
          <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1">
            <li>Create a "Size" attribute in WooCommerce → Products → Attributes</li>
            <li>Add size terms (S, M, L, XL) to the attribute</li>
            <li>Create a Variable Product and add the Size attribute</li>
            <li>Generate variations for each size</li>
            <li>Set prices and stock for each variation</li>
          </ol>
          <p className="text-yellow-700 text-sm mt-2">
            See <code>WOOCOMMERCE_SIZE_SETUP.md</code> for detailed instructions.
          </p>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Analysis Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Products:</span> {products.length}
            </div>
            <div>
              <span className="font-medium">Variable Products:</span> {products.filter(p => p.type === 'VARIABLE').length}
            </div>
            <div>
              <span className="font-medium">With Variations:</span> {products.filter(p => p.hasVariations).length}
            </div>
            <div>
              <span className="font-medium">With Size Info:</span> {products.filter(p => p.sizeInfo.hasSizes).length}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {products.map((product, index) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{product.name}</h2>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    product.type === 'VARIABLE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.type}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    product.sizeInfo.hasSizes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.sizeInfo.hasSizes ? 'Has Sizes' : 'No Sizes'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attributes */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Attributes</h3>
                  <div className="bg-gray-50 rounded p-3">
                    {product.hasAttributes ? (
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(product.attributes, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-gray-500 text-sm">No attributes</p>
                    )}
                  </div>
                </div>

                {/* Variations */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Variations</h3>
                  <div className="bg-gray-50 rounded p-3">
                    {product.hasVariations ? (
                      <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(product.variations, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-gray-500 text-sm">No variations</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Size Info */}
              <div className="mt-4">
                <h3 className="font-medium text-gray-700 mb-2">Extracted Size Information</h3>
                <div className="bg-yellow-50 rounded p-3">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(product.sizeInfo, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Size Selector Test */}
              {product.sizeInfo.hasSizes && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">Size Selector Preview</h3>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-sm text-green-700 mb-2">Available sizes: {product.sizeInfo.availableSizes.map((s: any) => s.value).join(', ')}</p>
                    <p className="text-sm text-green-700">Default size: {product.sizeInfo.defaultSize || 'None'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}