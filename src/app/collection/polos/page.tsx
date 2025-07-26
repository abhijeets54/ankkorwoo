'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ImageLoader from '@/components/ui/ImageLoader';
import usePageLoading from '@/hooks/usePageLoading';

export default function PolosComingSoonPage() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Use the page loading hook
  usePageLoading(isLoading, 'fabric');
  
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        <motion.h1 
          className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#2c2c27] mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Polo Collection Coming Soon
        </motion.h1>
        
        <motion.p 
          className="text-[#5c5c52] max-w-2xl mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          We're crafting a premium collection of polo shirts made from the finest materials. 
          Our artisans are meticulously designing each piece to ensure the perfect balance of 
          comfort, style, and durability that Ankkor is known for.
        </motion.p>
        
        <motion.div
          className="relative w-full max-w-4xl aspect-[16/9] mb-16 overflow-hidden bg-[#f4f3f0]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <ImageLoader 
            src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80" 
            alt="Polo Collection Preview" 
            fill
            className="object-cover"
            animate={true}
          />
        </motion.div>
        
        <motion.div
          className="space-y-8 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="font-serif text-2xl text-[#2c2c27]">What to Expect</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border border-[#e5e2d9] bg-[#f8f8f5]">
              <h3 className="font-serif text-xl text-[#2c2c27] mb-3">Premium Materials</h3>
              <p className="text-[#5c5c52]">Crafted from the finest Pima cotton, merino wool, and silk blends for unparalleled comfort and durability.</p>
            </div>
            <div className="p-6 border border-[#e5e2d9] bg-[#f8f8f5]">
              <h3 className="font-serif text-xl text-[#2c2c27] mb-3">Timeless Design</h3>
              <p className="text-[#5c5c52]">Classic silhouettes with subtle modern details, designed to transcend seasonal trends.</p>
            </div>
            <div className="p-6 border border-[#e5e2d9] bg-[#f8f8f5]">
              <h3 className="font-serif text-xl text-[#2c2c27] mb-3">Perfect Fit</h3>
              <p className="text-[#5c5c52]">Meticulously tailored for a refined fit that flatters the physique while ensuring all-day comfort.</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link 
            href="/collection/shirts" 
            className="px-8 py-3 bg-[#2c2c27] text-[#f4f3f0] text-sm uppercase tracking-wider hover:bg-[#3d3d35] transition-colors flex items-center justify-center"
          >
            Explore Shirts
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
} 