'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

// Simple loading component for Suspense
const Loading = () => (
  <div className="animate-pulse flex space-x-4">
    <div className="flex-1 space-y-6 py-1">
      <div className="h-2 bg-[#e5e2d9] rounded"></div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div className="h-2 bg-[#e5e2d9] rounded col-span-2"></div>
          <div className="h-2 bg-[#e5e2d9] rounded col-span-1"></div>
        </div>
        <div className="h-2 bg-[#e5e2d9] rounded"></div>
      </div>
    </div>
  </div>
);

// Dynamically import the component that uses useSearchParams with no SSR
const DynamicNotFoundContent = dynamic(() => import('./not-found-content'), { 
  ssr: false,
  loading: () => <Loading />
});

// Root component with proper handling for client-side navigation
export default function NotFound() {
  return (
    <div className="container mx-auto py-20">
      <DynamicNotFoundContent />
    </div>
  );
} 