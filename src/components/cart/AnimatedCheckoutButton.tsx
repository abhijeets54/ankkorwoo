'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface AnimatedCheckoutButtonProps {
  onClick: () => Promise<void>;
  isDisabled?: boolean;
  text?: string;
  loadingText?: string;
}

const AnimatedCheckoutButton: React.FC<AnimatedCheckoutButtonProps> = ({
  onClick,
  isDisabled = false,
  text = 'Proceed to Checkout',
  loadingText = 'Processing...'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (isDisabled || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onClick();
    } catch (err) {
      console.error('Checkout button error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <motion.button
        whileHover={!isDisabled && !isLoading ? { scale: 1.02 } : {}}
        whileTap={!isDisabled && !isLoading ? { scale: 0.98 } : {}}
        transition={{ duration: 0.2 }}
        className={`w-full py-3 px-4 rounded-md font-medium text-center transition-colors ${
          isDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isLoading
            ? 'bg-indigo-500 text-white cursor-wait'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        onClick={handleClick}
        disabled={isDisabled || isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            {loadingText}
          </span>
        ) : (
          text
        )}
      </motion.button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default AnimatedCheckoutButton;