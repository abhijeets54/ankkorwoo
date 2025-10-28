import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Anchor } from 'lucide-react';

export default function LaunchingSoon() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-[#2c2c27] text-[#f8f8f5] flex flex-col items-center justify-center"
    >
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?q=80')] bg-cover bg-center opacity-10"></div>
      
      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-12"
        >
          <div className="w-28 h-28 mx-auto rounded-full border border-[#8a8778]/40 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border border-[#8a8778]/80 flex items-center justify-center">
              <Anchor className="h-12 w-12 text-[#f8f8f5]" strokeWidth={1} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-serif mb-6">
            Coming Soon
          </h1>
          
          <div className="h-px w-24 bg-[#8a8778] mx-auto mb-8"></div>
          
          <p className="text-xl text-[#f4f3f0]/80 mb-12 font-light">
            We're crafting something exceptional. A curated collection of timeless essentials that embody sophistication and grace.
          </p>

          <div className="text-sm text-[#8a8778] uppercase tracking-widest font-light">
            Opening Fall 2025
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
        >
          <motion.div 
            className="w-1 h-12 bg-gradient-to-b from-[#8a8778] to-transparent"
            animate={{ 
              scaleY: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}