'use client';

import { useEffect, useState, useCallback } from 'react';

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

  const connect = useCallback(() => {
    if (!enabled || productIds.length === 0) {
      return;
    }

    const params = new URLSearchParams({
      products: productIds.join(',')
    });

    const eventSource = new EventSource(`/api/stock-updates?${params}`);

    eventSource.onopen = () => {
      console.log('Stock updates stream connected');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: StockUpdate = JSON.parse(event.data);
        setLastUpdate(update);

        if (update.type === 'stock_update') {
          console.log('Stock update received:', update);
          onStockUpdate?.(update);
        }
      } catch (parseError) {
        console.error('Error parsing stock update:', parseError);
      }
    };

    eventSource.onerror = (event) => {
      console.error('Stock updates stream error:', event);
      setIsConnected(false);
      setError('Connection to stock updates failed');
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          connect();
        }
      }, 5000);
    };

    return eventSource;
  }, [productIds, onStockUpdate, enabled]);

  useEffect(() => {
    const eventSource = connect();

    return () => {
      if (eventSource) {
        eventSource.close();
        setIsConnected(false);
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

  const handleStockUpdate = useCallback((update: StockUpdate) => {
    if (update.productId === productId) {
      setStockData({
        stockStatus: update.stockStatus,
        stockQuantity: update.stockQuantity,
        availableForSale: update.availableForSale,
        lastUpdated: update.timestamp
      });
    }
  }, [productId]);

  const { isConnected, error } = useStockUpdates({
    productIds: [productId],
    onStockUpdate: handleStockUpdate,
    enabled
  });

  return {
    stockData,
    isConnected,
    error
  };
}
