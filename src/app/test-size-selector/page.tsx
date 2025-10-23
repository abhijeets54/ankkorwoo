'use client';

import React, { useState } from 'react';
import SizeSelector from '@/components/product/SizeSelector';
import { SizeAttribute } from '@/lib/sizeAttributeProcessor';

// Mock size data for testing
const mockSizes: SizeAttribute[] = [
  {
    name: 'Size',
    value: 'S',
    slug: 's',
    isAvailable: true,
    stockQuantity: 10
  },
  {
    name: 'Size',
    value: 'M',
    slug: 'm',
    isAvailable: true,
    stockQuantity: 5
  },
  {
    name: 'Size',
    value: 'L',
    slug: 'l',
    isAvailable: true,
    stockQuantity: 2
  },
  {
    name: 'Size',
    value: 'XL',
    slug: 'xl',
    isAvailable: false,
    stockQuantity: 0
  }
];

export default function TestSizeSelectorPage() {
  const [selectedSize, setSelectedSize] = useState<string>('');

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    console.log('Size selected:', size);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Size Selector Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Full Variant</h2>
          <SizeSelector
            sizes={mockSizes}
            selectedSize={selectedSize}
            onSizeChange={handleSizeChange}
            variant="full"
            showAvailability={true}
            showPricing={false}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Compact Variant</h2>
          <SizeSelector
            sizes={mockSizes}
            selectedSize={selectedSize}
            onSizeChange={handleSizeChange}
            variant="compact"
            showAvailability={true}
            showPricing={false}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Inline Variant</h2>
          <SizeSelector
            sizes={mockSizes}
            selectedSize={selectedSize}
            onSizeChange={handleSizeChange}
            variant="inline"
            showAvailability={false}
            showPricing={false}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Selected Size</h2>
          <p className="text-gray-600">
            {selectedSize ? `You selected: ${selectedSize}` : 'No size selected'}
          </p>
        </div>
      </div>
    </div>
  );
}