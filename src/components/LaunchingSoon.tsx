import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Anchor } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';

// TimeBlock component for the countdown
const TimeBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-[#2c2c27]/20 backdrop-blur-sm border border-[#8a8778]/20 rounded-lg px-6 py-4">
      <span className="text-4xl font-serif">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className="text-[#8a8778] text-sm mt-2 font-light">{label}</span>
  </div>
);

export default function LaunchingSoon() {
  // Set target time to 10:00 PM tonight
  const today = new Date();
  const targetDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    22, // 10 PM
    0, // 0 minutes
    0  // 0 seconds
  );
  
  const timeLeft = useCountdown(targetDate);
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-[#2c2c27] text-[#f8f8f5] flex flex-col items-center justify-center"
    >
      <div className="absolute inset-0 bg-[url('/hero.jpg')] bg-cover bg-center opacity-10"></div>
      
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
            Launching Soon
          </h1>
          
          <div className="h-px w-24 bg-[#8a8778] mx-auto mb-8"></div>
          
          <p className="text-xl text-[#f4f3f0]/80 mb-12 font-light">
            We're crafting something exceptional. A curated collection of timeless essentials that embody sophistication and grace.
          </p>

          <div className="flex flex-col items-center gap-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex gap-6 items-center justify-center"
            >
              <TimeBlock value={timeLeft.hours} label="Hours" />
              <div className="text-[#8a8778] text-3xl font-light">:</div>
              <TimeBlock value={timeLeft.minutes} label="Minutes" />
              <div className="text-[#8a8778] text-3xl font-light">:</div>
              <TimeBlock value={timeLeft.seconds} label="Seconds" />
            </motion.div>

            <div className="text-sm text-[#8a8778] uppercase tracking-widest font-light">
              Opening Tonight at 10:00 PM
            </div>
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