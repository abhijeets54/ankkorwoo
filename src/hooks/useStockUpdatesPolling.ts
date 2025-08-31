'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

interface StockUpdate {
  type: 'stock_update';
  productId: string;
  stockStatus?: string;
  stockQuantity?: number;
  availableForSale?: boolean;
  timestamp: string;
}

interface PollingResponse {
  success: boolean;
  updates: StockUpdate[];
  timestamp: string;
  error?: string;
}

interface UseStockUpdatesPollingOptions {
  productIds?: string[];
  onStockUpdate?: (update: StockUpdate) => void;
  enabled?: boolean;
  pollInterval?: number; // milliseconds
}

export function useStockUpdatesPolling({
  productIds = [],
  onStockUpdate,
  enabled = true,
  pollInterval = 5000 // Poll every 5 seconds
}: UseStockUpdatesPollingOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<StockUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize productIds to prevent unnecessary re-renders
  const memoizedProductIds = useMemo(() => productIds, [productIds.join(',')]);
  
  // Stable callback reference
  const stableOnStockUpdate = useCallback((update: StockUpdate) => {
    onStockUpdate?.(update);
  }, [onStockUpdate]);

  const pollForUpdates = useCallback(async () => {
    if (!enabled || memoizedProductIds.length === 0) {
      setIsConnected(false);
      return;
    }

    // Create new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        products: memoizedProductIds.join(',')
      });

      const response = await fetch(`/api/stock-updates/poll?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PollingResponse = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setError(null);

        // Process any stock updates
        if (data.updates && data.updates.length > 0) {
          console.log(`Received ${data.updates.length} stock updates`);
          
          for (const update of data.updates) {
            console.log('Stock update received:', update);
            setLastUpdate(update);
            stableOnStockUpdate(update);
          }
        }
      } else {
        console.warn('Polling failed:', data.error);
        setError(data.error || 'Polling failed');
      }

    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      
      console.error('Error polling for stock updates:', fetchError);
      setIsConnected(false);
      setError(fetchError instanceof Error ? fetchError.message : 'Polling failed');
    }
  }, [memoizedProductIds, stableOnStockUpdate, enabled]);

  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    if (!enabled || memoizedProductIds.length === 0) {
      console.log('Stock updates polling disabled or no products specified');
      setIsConnected(false);
      return;
    }

    console.log('Starting stock updates polling for products:', memoizedProductIds);

    // Initial poll
    pollForUpdates();

    // Set up recurring polling
    const poll = async () => {
      if (!enabled || memoizedProductIds.length === 0) {
        return;
      }

      await pollForUpdates();
      
      // Schedule next poll
      if (enabled && memoizedProductIds.length > 0) {
        pollTimeoutRef.current = setTimeout(poll, pollInterval);
      }
    };

    // Start the polling cycle
    pollTimeoutRef.current = setTimeout(poll, pollInterval);
  }, [pollForUpdates, enabled, memoizedProductIds, pollInterval]);

  const stopPolling = useCallback(() => {
    console.log('Stopping stock updates polling');
    
    // Clear polling timeout
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsConnected(false);
  }, []);

  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return {
    isConnected,
    lastUpdate,
    error,
    reconnect: startPolling,
    stopPolling
  };
}

// Hook for single product stock updates using polling
export function useProductStockUpdatesPolling(
  productId: string, 
  enabled = true,
  pollInterval = 5000
) {
  const [stockData, setStockData] = useState<{
    stockStatus?: string;
    stockQuantity?: number;
    availableForSale?: boolean;
    lastUpdated?: string;
  }>({});

  // Memoize the productIds array to prevent recreation
  const memoizedProductIds = useMemo(() => 
    productId ? [productId] : [], 
    [productId]
  );

  // Stable callback that doesn't change unless productId changes
  const handleStockUpdate = useCallback((update: StockUpdate) => {
    if (update.productId === productId) {
      setStockData(prevData => ({
        ...prevData,
        stockStatus: update.stockStatus,
        stockQuantity: update.stockQuantity,
        availableForSale: update.availableForSale,
        lastUpdated: update.timestamp
      }));
    }
  }, [productId]);

  const { isConnected, error } = useStockUpdatesPolling({
    productIds: memoizedProductIds,
    onStockUpdate: handleStockUpdate,
    enabled: enabled && !!productId,
    pollInterval
  });

  return {
    stockData,
    isConnected,
    error
  };
}