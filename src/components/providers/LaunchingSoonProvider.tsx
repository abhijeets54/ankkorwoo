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
      // In production, use the NEXT_PUBLIC_LAUNCHING_SOON env var; in development, default to true
      isLaunchingSoon: process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_LAUNCHING_SOON === 'true'
        : true,
      setIsLaunchingSoon: (isLaunchingSoon) => {
        // In production, only allow changes if explicitly configured
        if (process.env.NODE_ENV === 'production') {
          console.warn('Changing launch state is disabled in production.');
          return;
        }
        set({ isLaunchingSoon });
      },
    }),
    {
      name: 'ankkor-launch-state', // Storage key
      // Add proper SSR handling
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

  // We need to handle hydration mismatches in Next.js
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    // In production, ensure the state matches the environment variable
    if (process.env.NODE_ENV === 'production') {
      // This ensures that if the env var changes on a new deploy,
      // the state will be updated even if localStorage has a different value
      const envValue = process.env.NEXT_PUBLIC_LAUNCHING_SOON === 'true';
      if (store.isLaunchingSoon !== envValue) {
        // Force the state to match the environment variable
        // This is a hacky way to update the state in production
        // because the setIsLaunchingSoon method is blocked in production
        useLaunchingSoonStore.setState({ isLaunchingSoon: envValue });
      }
    }
  }, [store]);

  // Always render children to prevent hydration mismatches
  // The individual components will handle their own hydration state
  return (
    <LaunchingSoonContext.Provider value={store}>
      {children}
    </LaunchingSoonContext.Provider>
  );
};

export default LaunchingSoonProvider; 