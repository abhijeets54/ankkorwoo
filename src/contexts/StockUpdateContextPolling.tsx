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

export function StockUpdateProvider({ children }: { children: React.ReactNode }) {
  const [stockDataMap, setStockDataMap] = useState<Map<string, StockData>>(new Map());
  const [subscribedProducts, setSubscribedProducts] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPollingRef = useRef(false);

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
      console.log('Subscribing to product (polling):', productId);
      return newSet;
    });
  }, []);

  const unsubscribeFromProduct = useCallback((productId: string) => {
    if (!productId) return;
    
    setSubscribedProducts(prev => {
      if (!prev.has(productId)) return prev;
      const newSet = new Set(prev);
      newSet.delete(productId);
      console.log('Unsubscribing from product (polling):', productId);
      return newSet;
    });
  }, []);

  const pollForUpdates = useCallback(async () => {
    if (subscribedProducts.size === 0 || isPollingRef.current) {
      return;
    }

    // Create new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      isPollingRef.current = true;
      
      const params = new URLSearchParams({
        products: Array.from(subscribedProducts).join(',')
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

        // Process any stock updates
        if (data.updates && data.updates.length > 0) {
          console.log(`Received ${data.updates.length} stock updates (polling)`);
          
          for (const update of data.updates) {
            console.log('Stock update received (polling):', update);
            updateStock(update.productId, {
              stockStatus: update.stockStatus,
              stockQuantity: update.stockQuantity,
              availableForSale: update.availableForSale,
              lastUpdated: update.timestamp
            });
          }
        }
      } else {
        console.warn('Polling failed:', data.error);
        setIsConnected(false);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      
      console.error('Error polling for stock updates:', error);
      setIsConnected(false);
    } finally {
      isPollingRef.current = false;
    }
  }, [subscribedProducts, updateStock]);

  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    if (subscribedProducts.size === 0) {
      console.log('No products subscribed, skipping polling');
      setIsConnected(false);
      return;
    }

    console.log('Starting stock updates polling for products:', Array.from(subscribedProducts));

    // Initial poll
    pollForUpdates();

    // Set up recurring polling
    const poll = async () => {
      if (subscribedProducts.size === 0) {
        return;
      }

      await pollForUpdates();
      
      // Schedule next poll
      if (subscribedProducts.size > 0) {
        pollTimeoutRef.current = setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };

    // Start the polling cycle
    pollTimeoutRef.current = setTimeout(poll, 5000);
  }, [pollForUpdates, subscribedProducts]);

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

    isPollingRef.current = false;
    setIsConnected(false);
  }, []);

  // Start/restart polling when subscribed products change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (subscribedProducts.size > 0) {
        startPolling();
      } else {
        stopPolling();
      }
    }, 500); // Debounce to reduce rapid changes

    return () => {
      clearTimeout(timeoutId);
    };
  }, [subscribedProducts, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

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