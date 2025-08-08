'use client';

import { useEffect, useState, useCallback } from 'react';
import { stockUpdateManager } from '@/lib/stockUpdateManager';

interface StockData {
  stockStatus?: string;
  stockQuantity?: number;
  availableForSale?: boolean;
  lastUpdated?: string;
}

export function useSimpleStockUpdates(productId: string, initialStock?: StockData) {
  const [stockData, setStockData] = useState<StockData>(initialStock || {});

  const handleStockUpdate = useCallback((update: any) => {
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

  useEffect(() => {
    if (!productId) return;

    // Subscribe to stock updates
    stockUpdateManager.subscribe(productId, handleStockUpdate);

    // Cleanup on unmount
    return () => {
      stockUpdateManager.unsubscribe(productId, handleStockUpdate);
    };
  }, [productId, handleStockUpdate]);

  return stockData;
}