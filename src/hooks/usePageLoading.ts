'use client';

import { useEffect } from 'react';
import { useLoading } from '@/components/providers/LoadingProvider';

/**
 * Hook to manually control page loading state
 * @param isLoading - Whether the page is loading
 * @param variant - The variant of the loader to use
 */
export function usePageLoading(
  isLoading: boolean, 
  variant?: 'thread' | 'fabric' | 'button'
) {
  const { setLoading, setVariant } = useLoading();

  useEffect(() => {
    setLoading(isLoading);
    if (variant) {
      setVariant(variant);
    }
  }, [isLoading, variant, setLoading, setVariant]);
}

export default usePageLoading; 