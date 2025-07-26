'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useLocalCartStore } from '@/lib/localCartStore';
import Cart from './Cart';

// Extended interface for cart context including UI state
interface CartContextType {
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  isOpen: boolean;
  itemCount: number;
}

// Create context with default values
const CartContext = createContext<CartContextType | undefined>(undefined);

// Custom hook to use cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const cartStore = useLocalCartStore();
  const [isOpen, setIsOpen] = useState(false);
  
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen(prevState => !prevState);
  
  const value = {
    openCart,
    closeCart,
    toggleCart,
    isOpen,
    itemCount: cartStore.itemCount
  };
  
  return (
    <CartContext.Provider value={value}>
      {children}
      <Cart isOpen={value.isOpen} toggleCart={value.toggleCart} />
    </CartContext.Provider>
  );
};

export default CartProvider; 