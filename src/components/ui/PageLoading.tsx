'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FashionLoader from './FashionLoader';

interface PageLoadingProps {
  isLoading: boolean;
  variant?: 'thread' | 'fabric' | 'button';
}

const PageLoading = ({ isLoading, variant = 'thread' }: PageLoadingProps) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#f8f8f5]/90 backdrop-blur-sm"
        >
          <FashionLoader variant={variant} size="lg" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageLoading; 