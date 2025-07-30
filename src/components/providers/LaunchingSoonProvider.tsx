'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the store type
interface LaunchingSoonState {
  isLaunchingSoon: boolean;
  setIsLaunchingSoon: (isLaunchingSoon: boolean) => void;
}

// Create a Zustand store with persistence and proper SSR handling
export const useLaunchingSoonStore = create<LaunchingSoonState>()(
  persist(
    (set) => ({
      // Default to false to prevent hydration mismatches
      // The actual value will be set by LaunchingStateInitializer on the client
      isLaunchingSoon: false,
      setIsLaunchingSoon: (isLaunchingSoon) => {
        set({ isLaunchingSoon });
      },
    }),
    {
      name: 'ankkor-launch-state', // Storage key
      // Add proper SSR handling with skipHydration
      skipHydration: true,
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          try {
            return localStorage.getItem(name);
          } catch (error) {
            console.error('localStorage.getItem error:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          try {
            localStorage.setItem(name, value);
          } catch (error) {
            console.error('localStorage.setItem error:', error);
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('localStorage.removeItem error:', error);
          }
        },
      },
    }
  )
);

// Create a React context for components that don't want to use Zustand directly
type LaunchingSoonContextType = {
  isLaunchingSoon: boolean;
  setIsLaunchingSoon: (isLaunchingSoon: boolean) => void;
};

const LaunchingSoonContext = createContext<LaunchingSoonContextType | undefined>(undefined);

export const useLaunchingSoon = () => {
  const context = useContext(LaunchingSoonContext);
  if (context === undefined) {
    throw new Error('useLaunchingSoon must be used within a LaunchingSoonProvider');
  }
  return context;
};

export const LaunchingSoonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the Zustand store to provide the context
  const store = useLaunchingSoonStore();

  // Handle hydration by rehydrating the store on client-side
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Rehydrate the store from localStorage
    useLaunchingSoonStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  // Always render children to prevent hydration mismatches
  // The LaunchingStateInitializer will handle setting the correct value
  return (
    <LaunchingSoonContext.Provider value={store}>
      {children}
    </LaunchingSoonContext.Provider>
  );
};

export default LaunchingSoonProvider; 