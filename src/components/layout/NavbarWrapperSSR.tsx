'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import NavbarWrapper to avoid SSR issues with store imports
const NavbarWrapper = dynamic(() => import('./NavbarWrapper'), {
  ssr: false,
  loading: () => null // Don't show loading state for navbar
});

/**
 * SSR-safe wrapper for the NavbarWrapper component.
 * This component ensures the NavbarWrapper is only rendered on the client-side
 * after stores have been properly hydrated.
 */
export default function NavbarWrapperSSR() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait a bit for stores to be hydrated before showing navbar
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Don't render navbar until client-side hydration is complete
  if (!isHydrated) {
    return null;
  }

  return <NavbarWrapper />;
}
