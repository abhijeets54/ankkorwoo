'use client';

import { useState, useCallback, useEffect } from 'react';
import { WooProduct } from '@/lib/woocommerce';

export interface QuickViewState {
  product: WooProduct | null;
  isOpen: boolean;
}

export const useQuickView = () => {
  const [state, setState] = useState<QuickViewState>({
    product: null,
    isOpen: false,
  });

  const openQuickView = useCallback((product: WooProduct) => {
    setState({
      product,
      isOpen: true,
    });
    // Lock body scroll when modal opens
    document.body.style.overflow = 'hidden';
  }, []);

  const closeQuickView = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
    // Unlock body scroll when modal closes
    document.body.style.overflow = 'unset';

    // Clear product after animation completes
    setTimeout(() => {
      setState({
        product: null,
        isOpen: false,
      });
    }, 300);
  }, []);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.isOpen) {
        closeQuickView();
      }
    };

    if (state.isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [state.isOpen, closeQuickView]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return {
    product: state.product,
    isOpen: state.isOpen,
    openQuickView,
    closeQuickView,
  };
};
