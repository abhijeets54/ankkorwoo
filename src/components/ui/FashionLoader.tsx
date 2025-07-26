'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface FashionLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'thread' | 'fabric' | 'button';
  className?: string;
}

const FashionLoader = ({ 
  size = 'md', 
  variant = 'thread', 
  className = '' 
}: FashionLoaderProps) => {
  // Size mappings
  const sizeMap = {
    sm: {
      container: 'w-16 h-16',
      text: 'text-xs',
    },
    md: {
      container: 'w-24 h-24',
      text: 'text-sm',
    },
    lg: {
      container: 'w-32 h-32',
      text: 'text-base',
    },
  };

  // Thread Loader - Inspired by sewing thread
  if (variant === 'thread') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`relative ${sizeMap[size].container}`}>
          <motion.div 
            className="absolute inset-0 rounded-full border-2 border-[#e5e2d9]"
            style={{ borderTopColor: '#2c2c27', borderRightColor: '#2c2c27' }}
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          <motion.div 
            className="absolute inset-2 rounded-full border-2 border-[#e5e2d9]"
            style={{ borderBottomColor: '#8a8778', borderLeftColor: '#8a8778' }}
            animate={{ rotate: -360 }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#2c2c27]" />
          </div>
        </div>
        <p className={`mt-4 font-serif text-[#5c5c52] ${sizeMap[size].text}`}>Loading Collection</p>
      </div>
    );
  }

  // Fabric Loader - Inspired by fabric swatches
  if (variant === 'fabric') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`relative ${sizeMap[size].container} flex items-center justify-center`}>
          <motion.div 
            className="absolute w-1/3 h-1/3 bg-[#e5e2d9]"
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute w-1/3 h-1/3 bg-[#8a8778]"
            animate={{ 
              rotate: -360,
              scale: [1, 0.8, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.3
            }}
          />
          <motion.div 
            className="absolute w-1/3 h-1/3 bg-[#2c2c27]"
            animate={{ 
              rotate: 360,
              scale: [1, 0.8, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.6
            }}
          />
        </div>
        <p className={`mt-4 font-serif text-[#5c5c52] ${sizeMap[size].text}`}>Preparing Your Style</p>
      </div>
    );
  }

  // Button Loader - Inspired by clothing buttons
  if (variant === 'button') {
    const buttons = [0, 1, 2, 3];
    
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`relative ${sizeMap[size].container} flex items-center justify-center`}>
          <div className="relative flex">
            {buttons.map((index) => (
              <motion.div 
                key={index}
                className="w-3 h-3 mx-1 rounded-full bg-[#2c2c27] border border-[#8a8778]"
                animate={{ 
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: index * 0.2
                }}
              />
            ))}
          </div>
        </div>
        <p className={`mt-4 font-serif text-[#5c5c52] ${sizeMap[size].text}`}>Tailoring Experience</p>
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizeMap[size].container}`}>
        <motion.div 
          className="absolute inset-0 rounded-full border-2 border-[#e5e2d9]"
          style={{ borderTopColor: '#2c2c27' }}
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </div>
      <p className={`mt-4 font-serif text-[#5c5c52] ${sizeMap[size].text}`}>Loading</p>
    </div>
  );
};

export default FashionLoader; 