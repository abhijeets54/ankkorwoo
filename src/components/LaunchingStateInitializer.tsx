'use client';

import { useEffect } from 'react';
import { useLaunchingSoonStore } from './providers/LaunchingSoonProvider';

/**
 * SSR-safe component that initializes the launching state from environment variables.
 * This component properly handles client-side state initialization without hydration mismatches.
 */
export default function LaunchingStateInitializer() {
  useEffect(() => {
    // Only run on client-side to prevent hydration mismatches
    if (typeof window !== 'undefined') {
      // Get the environment variable value on the client
      const envValue = process.env.NEXT_PUBLIC_LAUNCHING_SOON === 'true';

      // Update the store with the environment variable value
      // This ensures consistency between server and client
      useLaunchingSoonStore.getState().setIsLaunchingSoon(envValue);
    }
  }, []);

  // This component renders nothing - it's purely for side effects
  return null;
}