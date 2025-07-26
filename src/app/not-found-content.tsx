'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Client component that safely uses useSearchParams
const NotFoundContent = () => {
  // This hook is now safely used in a dynamically imported client component
  const searchParams = useSearchParams();
  const from = searchParams?.get('from') || '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-9xl font-serif font-bold text-[#2c2c27]">404</h1>
      <h2 className="text-2xl md:text-3xl font-serif mt-6 mb-8 text-[#5c5c52]">
        Page Not Found
      </h2>
      <p className="max-w-md mb-10 text-[#8a8778]">
        {from ? `The page "${from}" could not be found.` : 
          'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.'}
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 px-6 py-3 bg-[#2c2c27] text-white hover:bg-[#3d3d35] transition-colors"
      >
        <ArrowLeft size={16} />
        Return to Homepage
      </Link>
    </div>
  );
};

export default NotFoundContent; 