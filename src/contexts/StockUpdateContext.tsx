'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface StockData {
  stockStatus?: string;
  stockQuantity?: number;
  availableForSale?: boolean;
  lastUpdated?: string;
}

interface StockUpdateContextValue {
  getStockData: (productId: string) => StockData | null;
  updateStock: (productId: string, stockData: StockData) => void;
  subscribeToProduct: (productId: string) => void;
  unsubscribeFromProduct: (productId: string) => void;
  isConnected: boolean;
}

const StockUpdateContext = createContext<StockUpdateContextValue | null>(null);

export function useStockUpdateContext() {
  const context = useContext(StockUpdateContext);
  if (!context) {
    throw new Error('useStockUpdateContext must be used within a StockUpdateProvider');
  }
  return context;
}

interface StockUpdate {
  type: 'connected' | 'stock_update' | 'heartbeat';
  productId?: string;
  stockStatus?: string;
  stockQuantity?: number;
  availableForSale?: boolean;
  message?: string;
  timestamp: string;
}

export function StockUpdateProvider({ children }: { children: React.ReactNode }) {
  const [stockDataMap, setStockDataMap] = useState<Map<string, StockData>>(new Map());
  const [subscribedProducts, setSubscribedProducts] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const lastConnectionParamsRef = useRef<string>('');

  const getStockData = useCallback((productId: string): StockData | null => {
    return stockDataMap.get(productId) || null;
  }, [stockDataMap]);

  const updateStock = useCallback((productId: string, stockData: StockData) => {
    setStockDataMap(prev => {
      const newMap = new Map(prev);
      const existingData = newMap.get(productId) || {};
      newMap.set(productId, { ...existingData, ...stockData });
      return newMap;
    });
  }, []);

  const subscribeToProduct = useCallback((productId: string) => {
    if (!productId) return;
    
    setSubscribedProducts(prev => {
      if (prev.has(productId)) return prev;
      const newSet = new Set(prev);
      newSet.add(productId);
      console.log('Subscribing to product:', productId);
      return newSet;
    });
  }, []);

  const unsubscribeFromProduct = useCallback((productId: string) => {
    if (!productId) return;
    
    setSubscribedProducts(prev => {
      if (!prev.has(productId)) return prev;
      const newSet = new Set(prev);
      newSet.delete(productId);
      console.log('Unsubscribing from product:', productId);
      return newSet;
    });
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current) {
      console.log('Connection already in progress, skipping');
      return;
    }

    if (subscribedProducts.size === 0) {
      console.log('No products subscribed, skipping connection');
      return;
    }

    // Check if we already have a connection for the same products
    const currentParams = Array.from(subscribedProducts).sort().join(',');
    if (eventSourceRef.current && 
        eventSourceRef.current.readyState === EventSource.OPEN && 
        lastConnectionParamsRef.current === currentParams) {
      console.log('Already connected to same products, skipping');
      return;
    }

    // Clear any existing connection
    if (eventSourceRef.current) {
      console.log('Closing existing connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isConnectingRef.current = true;
    lastConnectionParamsRef.current = currentParams;

    const params = new URLSearchParams({
      products: currentParams
    });

    console.log('Creating stock updates connection for products:', Array.from(subscribedProducts));
    const eventSource = new EventSource(`/api/stock-updates?${params}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('Stock updates stream connected');
      setIsConnected(true);
      isConnectingRef.current = false;
    };

    eventSource.onmessage = (event) => {
      try {
        const update: StockUpdate = JSON.parse(event.data);

        if (update.type === 'stock_update' && update.productId) {
          console.log('Stock update received:', update);
          updateStock(update.productId, {
            stockStatus: update.stockStatus,
            stockQuantity: update.stockQuantity,
            availableForSale: update.availableForSale,
            lastUpdated: update.timestamp
          });
        }
      } catch (parseError) {
        console.error('Error parsing stock update:', parseError);
      }
    };

    eventSource.onerror = (event) => {
      console.error('Stock updates stream error:', event);
      setIsConnected(false);
      isConnectingRef.current = false;
      
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
  }, [subscribedProducts]);

  // Reconnect when subscribed products change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      connect();
    }, 500); // Increased debounce to reduce rapid reconnections

    return () => {
      clearTimeout(timeoutId);
    };
  }, [subscribedProducts, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        console.log('Cleaning up stock updates connection on unmount');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      isConnectingRef.current = false;
    };
  }, []);

  const contextValue: StockUpdateContextValue = {
    getStockData,
    updateStock,
    subscribeToProduct,
    unsubscribeFromProduct,
    isConnected
  };

  return (
    <StockUpdateContext.Provider value={contextValue}>
      {children}
    </StockUpdateContext.Provider>
  );
}

// Hook for product components to use real-time stock updates
export function useProductStock(productId: string, initialStock?: StockData) {
  const { getStockData, subscribeToProduct, unsubscribeFromProduct, updateStock } = useStockUpdateContext();
  const hasInitialized = useRef(false);
  
  // Subscribe to this product on mount
  useEffect(() => {
    if (productId && !hasInitialized.current) {
      subscribeToProduct(productId);
      
      // Set initial stock data if provided (only once)
      if (initialStock) {
        updateStock(productId, initialStock);
      }
      
      hasInitialized.current = true;
      
      return () => {
        unsubscribeFromProduct(productId);
        hasInitialized.current = false;
      };
    }
  }, [productId]); // Only depend on productId

  // Get current stock data
  const stockData = getStockData(productId);
  
  return stockData;
}