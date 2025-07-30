'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import FooterWrapper to avoid SSR issues with store imports
const FooterWrapper = dynamic(() => import('./FooterWrapper'), {
  ssr: false,
  loading: () => null // Don't show loading state for footer
});

/**
 * SSR-safe wrapper for the FooterWrapper component.
 * This component ensures the FooterWrapper is only rendered on the client-side
 * after stores have been properly hydrated.
 */
export default function FooterWrapperSSR() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait a bit for stores to be hydrated before showing footer
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Don't render footer until client-side hydration is complete
  if (!isHydrated) {
    return null;
  }

  return <FooterWrapper />;
}
