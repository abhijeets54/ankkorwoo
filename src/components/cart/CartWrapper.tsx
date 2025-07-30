'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Cart component to avoid SSR issues with store imports
const Cart = dynamic(() => import('./Cart'), {
  ssr: false,
  loading: () => null // Don't show loading state for cart
});

/**
 * SSR-safe wrapper for the Cart component.
 * This component ensures the Cart is only rendered on the client-side
 * after stores have been properly hydrated.
 */
export default function CartWrapper() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait a bit for stores to be hydrated before showing cart
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Don't render cart until client-side hydration is complete
  if (!isHydrated) {
    return null;
  }

  return <Cart />;
}
