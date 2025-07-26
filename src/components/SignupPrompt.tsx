'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingBag, User } from 'lucide-react';
import { useCartStore, useWishlistStore } from '@/lib/store';
import { useCustomer } from '@/components/providers/CustomerProvider';

interface SignupPromptProps {
  type?: 'cart' | 'wishlist' | 'auto';
  delay?: number;
  position?: 'bottom' | 'top';
}

const SignupPrompt: React.FC<SignupPromptProps> = ({ 
  type = 'auto',
  delay = 2000,
  position = 'bottom'
}) => {
  const [show, setShow] = useState(false);
  const { isAuthenticated } = useCustomer();
  const { items: cartItems } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  
  // Initialize a constant for the cookie/localStorage key
  const PROMPT_DISMISSED_KEY = 'ankkor_signup_prompt_dismissed';
  
  // Determine which type of prompt to show based on user activity
  const determinePromptType = () => {
    if (type !== 'auto') return type;
    
    if (cartItems.length > 0) return 'cart';
    if (wishlistItems.length > 0) return 'wishlist';
    return 'cart'; // Default fallback
  };
  
  const promptType = determinePromptType();
  
  // Check if the prompt has been dismissed before
  const hasBeenDismissed = () => {
    if (typeof window === 'undefined') return false;
    
    // Check sessionStorage first (shorter-term)
    const sessionDismissed = sessionStorage.getItem(PROMPT_DISMISSED_KEY);
    if (sessionDismissed === 'true') return true;
    
    // Then check localStorage (longer-term)
    const localDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    return localDismissed === 'true';
  };
  
  // Determine if we should show the prompt
  useEffect(() => {
    if (isAuthenticated) return; // Don't show to logged-in users
    if (hasBeenDismissed()) return; // Don't show if dismissed before
    
    // Show based on cart or wishlist activity
    const shouldShow = 
      (promptType === 'cart' && cartItems.length > 0) || 
      (promptType === 'wishlist' && wishlistItems.length > 0);
    
    if (shouldShow) {
      const timer = setTimeout(() => {
        setShow(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, cartItems.length, wishlistItems.length, delay, promptType]);
  
  const handleDismiss = () => {
    setShow(false);
    
    // Remember in session storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    }
  };
  
  // Don't render anything if we shouldn't show the prompt
  if (isAuthenticated || !show) return null;
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: position === 'bottom' ? 50 : -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'bottom' ? 50 : -50 }}
          className={`fixed ${
            position === 'bottom' ? 'bottom-8' : 'top-20'
          } left-1/2 transform -translate-x-1/2 w-full max-w-md mx-auto px-4 z-50`}
        >
          <div className="bg-white border border-[#e5e2d9] shadow-lg rounded-md p-4">
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                {promptType === 'cart' ? (
                  <ShoppingBag className="h-5 w-5 text-[#8a8778]" />
                ) : (
                  <Heart className="h-5 w-5 text-[#8a8778]" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-serif text-[#2c2c27] font-medium mb-1">
                  {promptType === 'cart' 
                    ? 'Create an account to save your cart' 
                    : 'Save your wishlist for later'}
                </h3>
                <p className="text-sm text-[#5c5c52] mb-3">
                  {promptType === 'cart'
                    ? 'Create an account to save your cart and make checkout faster.'
                    : 'Create an account to access your wishlist from any device.'}
                </p>
                
                <div className="flex space-x-3">
                  <Link 
                    href="/sign-up"
                    className="px-4 py-2 bg-[#2c2c27] text-white text-sm rounded-sm hover:bg-[#3d3d35] transition-colors flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Create Account
                  </Link>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 border border-[#e5e2d9] text-[#5c5c52] text-sm rounded-sm hover:bg-[#f4f3f0] transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="ml-3 text-[#8a8778] hover:text-[#2c2c27] transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignupPrompt; 