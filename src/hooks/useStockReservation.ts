import { useState, useEffect, useCallback } from 'react';

export interface StockReservation {
  id: string;
  productId: string;
  variationId?: string;
  quantity: number;
  userId: string;
  reservedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'confirmed';
  cartId?: string;
}

export interface ReservationState {
  reservations: StockReservation[];
  loading: boolean;
  error: string | null;
}

export interface UseStockReservationReturn {
  // State
  reservations: StockReservation[];
  loading: boolean;
  error: string | null;
  
  // Actions
  createReservation: (productId: string, quantity: number, variationId?: string) => Promise<StockReservation | null>;
  confirmReservation: (reservationId: string) => Promise<boolean>;
  releaseReservation: (reservationId: string) => Promise<boolean>;
  checkAvailableStock: (productId: string, variationId?: string) => Promise<{
    availableStock: number;
    totalStock: number;
    reservedStock: number;
  } | null>;
  getUserReservations: () => Promise<void>;
  
  // Utilities
  getReservationForProduct: (productId: string, variationId?: string) => StockReservation | null;
  getTimeRemaining: (reservation: StockReservation) => number; // seconds remaining
  isReservationExpired: (reservation: StockReservation) => boolean;
}

export function useStockReservation(userId?: string): UseStockReservationReturn {
  const [state, setState] = useState<ReservationState>({
    reservations: [],
    loading: false,
    error: null
  });

  // Generate user ID if not provided (for guest users)
  const effectiveUserId = userId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  // Create a new stock reservation
  const createReservation = useCallback(async (
    productId: string, 
    quantity: number, 
    variationId?: string
  ): Promise<StockReservation | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          productId,
          quantity,
          userId: effectiveUserId,
          variationId
        })
      });

      const data = await response.json();

      if (data.success && data.reservation) {
        setState(prev => ({
          ...prev,
          reservations: [...prev.reservations, data.reservation],
          loading: false
        }));
        return data.reservation;
      } else {
        setState(prev => ({ ...prev, error: data.error, loading: false }));
        return null;
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to create reservation', 
        loading: false 
      }));
      return null;
    }
  }, [effectiveUserId]);

  // Confirm a reservation (convert to sale)
  const confirmReservation = useCallback(async (reservationId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          reservationId
        })
      });

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          reservations: prev.reservations.map(r => 
            r.id === reservationId ? { ...r, status: 'confirmed' } : r
          )
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to confirm reservation:', error);
      return false;
    }
  }, []);

  // Release a reservation
  const releaseReservation = useCallback(async (reservationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/reservations?reservationId=${reservationId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          reservations: prev.reservations.filter(r => r.id !== reservationId)
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to release reservation:', error);
      return false;
    }
  }, []);

  // Check available stock for a product
  const checkAvailableStock = useCallback(async (
    productId: string, 
    variationId?: string
  ): Promise<{
    availableStock: number;
    totalStock: number;
    reservedStock: number;
  } | null> => {
    try {
      const params = new URLSearchParams({
        action: 'check_stock',
        productId
      });
      
      if (variationId) {
        params.append('variationId', variationId);
      }

      const response = await fetch(`/api/reservations?${params}`);
      const data = await response.json();

      if (data.success) {
        return {
          availableStock: data.availableStock,
          totalStock: data.totalStock,
          reservedStock: data.reservedStock
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to check available stock:', error);
      return null;
    }
  }, []);

  // Get user's active reservations
  const getUserReservations = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/reservations?action=user_reservations&userId=${effectiveUserId}`);
      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          reservations: data.reservations,
          loading: false
        }));
      } else {
        setState(prev => ({ ...prev, error: data.error, loading: false }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch reservations', 
        loading: false 
      }));
    }
  }, [effectiveUserId]);

  // Get reservation for a specific product
  const getReservationForProduct = useCallback((
    productId: string, 
    variationId?: string
  ): StockReservation | null => {
    return state.reservations.find(r => 
      r.productId === productId && 
      r.variationId === variationId &&
      r.status === 'active'
    ) || null;
  }, [state.reservations]);

  // Get time remaining for a reservation (in seconds)
  const getTimeRemaining = useCallback((reservation: StockReservation): number => {
    const expiresAt = new Date(reservation.expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  }, []);

  // Check if reservation is expired
  const isReservationExpired = useCallback((reservation: StockReservation): boolean => {
    return getTimeRemaining(reservation) <= 0;
  }, [getTimeRemaining]);

  // Auto-cleanup expired reservations
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        reservations: prev.reservations.filter(r => !isReservationExpired(r))
      }));
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isReservationExpired]);

  // Load user reservations on mount
  useEffect(() => {
    if (effectiveUserId) {
      getUserReservations();
    }
  }, [effectiveUserId, getUserReservations]);

  return {
    // State
    reservations: state.reservations,
    loading: state.loading,
    error: state.error,
    
    // Actions
    createReservation,
    confirmReservation,
    releaseReservation,
    checkAvailableStock,
    getUserReservations,
    
    // Utilities
    getReservationForProduct,
    getTimeRemaining,
    isReservationExpired
  };
}
