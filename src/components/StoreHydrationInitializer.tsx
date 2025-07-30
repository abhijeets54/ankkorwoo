'use client';

import { useEffect } from 'react';

/**
 * SSR-safe component that handles hydration of global Zustand stores.
 * This component ensures that stores with persistence are properly rehydrated
 * on the client-side without causing hydration mismatches.
 *
 * Uses dynamic imports to avoid importing stores during SSR.
 * Based on official Zustand documentation for Next.js SSR:
 * https://zustand.docs.pmnd.rs/integrations/persisting-store-data#usage-in-next.js
 */
export default function StoreHydrationInitializer() {
  useEffect(() => {
    // Only run on client-side to prevent hydration mismatches
    if (typeof window !== 'undefined') {
      // Dynamically import and rehydrate stores to avoid SSR issues
      const rehydrateStores = async () => {
        try {
          // Import stores dynamically to avoid SSR issues
          const [{ useWishlistStore }, { useLocalCartStore }] = await Promise.all([
            import('@/lib/store'),
            import('@/lib/localCartStore')
          ]);

          // Rehydrate the wishlist store from localStorage
          useWishlistStore.persist.rehydrate();

          // Rehydrate the local cart store from localStorage
          useLocalCartStore.persist.rehydrate();

          // Optional: Log hydration completion in development
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Store hydration completed: wishlist and cart stores rehydrated');
          }
        } catch (error) {
          console.error('Error during store hydration:', error);
        }
      };

      rehydrateStores();
    }
  }, []);

  // This component renders nothing - it's purely for side effects
  return null;
}
