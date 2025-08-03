'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

interface StockUpdate {
  type: 'connected' | 'stock_update' | 'heartbeat';
  productId?: string;
  stockStatus?: string;
  stockQuantity?: number;
  availableForSale?: boolean;
  message?: string;
  timestamp: string;
}

interface UseStockUpdatesOptions {
  productIds?: string[];
  onStockUpdate?: (update: StockUpdate) => void;
  enabled?: boolean;
}

export function useStockUpdates({
  productIds = [],
  onStockUpdate,
  enabled = true
}: UseStockUpdatesOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<StockUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize productIds to prevent unnecessary re-renders
  const memoizedProductIds = useMemo(() => productIds, [productIds.join(',')]);
  
  // Stable callback reference
  const stableOnStockUpdate = useCallback((update: StockUpdate) => {
    onStockUpdate?.(update);
  }, [onStockUpdate]);

  const connect = useCallback(() => {
    // Clear any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (!enabled || memoizedProductIds.length === 0) {
      console.log('Stock updates disabled or no products specified');
      return null;
    }

    const params = new URLSearchParams({
      products: memoizedProductIds.join(',')
    });

    console.log('Creating new stock updates connection for products:', memoizedProductIds);
    const eventSource = new EventSource(`/api/stock-updates?${params}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('Stock updates stream connected for products:', memoizedProductIds);
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: StockUpdate = JSON.parse(event.data);
        setLastUpdate(update);

        if (update.type === 'stock_update') {
          console.log('Stock update received:', update);
          stableOnStockUpdate(update);
        }
      } catch (parseError) {
        console.error('Error parsing stock update:', parseError);
      }
    };

    eventSource.onerror = (event) => {
      console.error('Stock updates stream error:', event);
      setIsConnected(false);
      setError('Connection to stock updates failed');
      
      // Only attempt to reconnect if this is still the current connection
      if (eventSourceRef.current === eventSource) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current === eventSource && eventSource.readyState === EventSource.CLOSED) {
            console.log('Attempting to reconnect stock updates...');
            connect();
          }
        }, 5000);
      }
    };

    return eventSource;
  }, [memoizedProductIds, stableOnStockUpdate, enabled]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup function
      if (eventSourceRef.current) {
        console.log('Cleaning up stock updates connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastUpdate,
    error,
    reconnect: connect
  };
}

// Hook for single product stock updates
export function useProductStockUpdates(productId: string, enabled = true) {
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

  const { isConnected, error } = useStockUpdates({
    productIds: memoizedProductIds,
    onStockUpdate: handleStockUpdate,
    enabled: enabled && !!productId
  });

  return {
    stockData,
    isConnected,
    error
  };
}
