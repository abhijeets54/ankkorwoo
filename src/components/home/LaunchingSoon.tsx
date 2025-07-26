'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLaunchingSoonStore } from '@/components/providers/LaunchingSoonProvider';

const LaunchingSoon = () => {
  const { isLaunchingSoon } = useLaunchingSoonStore();

  // For developer: Easy way to disable the launch screen with keyboard shortcut
  // Only works in development mode
  useEffect(() => {
    // Only add keyboard shortcuts in development
    if (process.env.NODE_ENV !== 'production') {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Allow pressing Ctrl+Alt+L to toggle launch screen (developer shortcut)
        if (e.ctrlKey && e.altKey && e.key === 'l') {
          const store = useLaunchingSoonStore.getState();
          store.setIsLaunchingSoon(!store.isLaunchingSoon);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  if (!isLaunchingSoon) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background - uses a grayscale image that transitions to color on hover */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#2c2c27]/80 backdrop-blur-md z-10"></div>
        <Image 
          src="https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80"
          alt="Ankkor Background"
          fill
          className="object-cover grayscale hover:grayscale-0 transition-all duration-1000 opacity-30"
          priority
        />
      </div>
      
      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-20 text-center px-6"
      >
        <h1 className="text-[#f8f8f5] font-serif text-5xl md:text-7xl lg:text-9xl font-bold mb-6 tracking-tight">
          Launching Soon
        </h1>
        <p className="text-[#e5e2d9] max-w-xl mx-auto text-lg md:text-xl">
          Ankkor is coming soon with <b> Premium formal clothing </b> for the <b> gentlemen</b>.
        </p>
      </motion.div>
      
      {/* Developer notice - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 p-3 rounded-sm text-xs z-50 opacity-70 hover:opacity-100 transition-opacity">
          <p>Developer: Press Ctrl+Alt+L to toggle launch screen</p>
        </div>
      )}
    </div>
  );
};

export default LaunchingSoon; 