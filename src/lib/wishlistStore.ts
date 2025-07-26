'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: string;
  image: string;
  slug: string;
}

interface WishlistState {
  items: WishlistItem[];
  
  // Actions
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  clearWishlist: () => void;
  
  // Computed
  isInWishlist: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addToWishlist: (item) => {
        const { items } = get();
        const exists = items.some((i) => i.id === item.id);
        
        if (!exists) {
          set({ items: [...items, item] });
        }
      },
      
      removeFromWishlist: (id) => {
        const { items } = get();
        set({ items: items.filter((item) => item.id !== id) });
      },
      
      clearWishlist: () => {
        set({ items: [] });
      },
      
      isInWishlist: (id) => {
        const { items } = get();
        return items.some((item) => item.id === id);
      },
    }),
    {
      name: 'wishlist-storage',
      skipHydration: typeof window === 'undefined',
    }
  )
); 