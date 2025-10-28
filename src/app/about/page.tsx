'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Anchor, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  // Animation controls
  const controls = useAnimation();
  const imagesRef = useRef(null);
  const contentRef = useRef(null);
  const inViewImages = useInView(imagesRef, { once: true, margin: "-10% 0px" });
  const inViewContent = useInView(contentRef, { once: true });
  
  useEffect(() => {
    if (inViewContent) {
      controls.start('visible');
    }
  }, [controls, inViewContent]);
  
  // Enhanced animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1] 
      } 
    }
  };
  
  const slideUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 1.2, 
        ease: [0.16, 1, 0.3, 1] 
      } 
    }
  };
  
  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.25
      }
    }
  };
  
  const imageReveal = {
    hidden: { opacity: 0, scale: 1.05 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        duration: 1.2, 
        ease: [0.22, 1, 0.36, 1] 
      } 
    }
  };
  
  const lineReveal = {
    hidden: { width: 0 },
    visible: { 
      width: "100%", 
      transition: { 
        duration: 1.5, 
        ease: [0.22, 1, 0.36, 1] 
      } 
    }
  };
  
  const letterAnimation = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1] 
      } 
    }
  };
  
  return (
    <div className="min-h-screen bg-[#f8f8f5] overflow-hidden">
      {/* Hero Section - Luxury Treatment */}
      <div className="relative h-[85vh] overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <Image
            src="/ap1.png"
            alt="ANKKOR Heritage"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2c2c27]/80 via-[#2c2c27]/20 to-[#2c2c27]/40"></div>
        </motion.div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mb-12 flex justify-center"
            >
              <div className="w-28 h-28 rounded-full border border-[#8a8778]/40 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-[#8a8778]/80 flex items-center justify-center">
                  <Anchor className="h-12 w-12 text-[#f8f8f5]" strokeWidth={1} />
                </div>
              </div>
            </motion.div>
            
            <div className="overflow-hidden mb-8">
              <motion.h1 
                className="text-5xl md:text-7xl lg:text-8xl font-serif text-[#f8f8f5] tracking-wide leading-tight"
                initial={{ y: 150 }}
                animate={{ y: 0 }}
                transition={{ duration: 1.2, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              >
                Our Heritage
              </motion.h1>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.4 }}
              className="mb-6"
            >
              <p className="text-[#f4f3f0]/80 text-base md:text-lg font-light tracking-widest uppercase">
                (About Us)
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.5, delay: 1.2 }}
              className="relative"
            >
              <div className="h-[1px] w-48 bg-[#8a8778] mx-auto mb-8 relative">
                <div className="absolute -top-[3px] left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full bg-[#8a8778]"></div>
              </div>
              <p className="text-[#f4f3f0] text-lg md:text-xl max-w-xl mx-auto font-light italic font-serif leading-relaxed">
                A legacy of timeless elegance and exceptional craftsmanship
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 2 }}
              className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
            >
              <div className="w-8 h-14 border-2 border-[#8a8778]/60 rounded-full flex justify-center">
                <motion.div 
                  className="w-1 h-3 bg-[#8a8778] rounded-full mt-2"
                  animate={{ 
                    y: [0, 12, 0],
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content - Elevated styling */}
      <div className="bg-[#f8f8f5]">
        <div className="container mx-auto px-4 py-24 md:py-36" ref={contentRef}>
          <motion.div
            className="max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            animate={controls}
          >
            {/* Opening Statement */}
            <motion.div 
              className="mb-32 text-center"
              variants={fadeIn}
            >
              <h2 className="font-serif text-3xl md:text-5xl text-[#2c2c27] mb-10 tracking-wide leading-relaxed max-w-3xl mx-auto">
                ANKKOR – The Anchor of Timeless Style
              </h2>
              <div className="relative">
                <div className="w-24 h-[2px] bg-[#8a8778] mx-auto mb-12"></div>
                <div className="absolute -top-[4px] left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 bg-[#f8f8f5] border border-[#8a8778]"></div>
              </div>
              <p className="text-[#5c5c52] text-xl max-w-2xl mx-auto font-serif leading-relaxed">
                Founded in 2025, ANKKOR emerged with a vision: to revive the elegance of classic, old money formals and make them a part of everyday wear.
              </p>
            </motion.div>
            
            {/* Heritage Image + Content */}
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-32 items-center"
              variants={slideUp}
              ref={imagesRef}
            >
              <div className="lg:col-span-7 order-1">
                <motion.div 
                  className="relative"
                  initial={{ opacity: 0, y: 40 }}
                  animate={inViewImages ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="absolute -inset-4 border border-[#8a8778]/20 -z-10"></div>
                  <div className="overflow-hidden">
                    <Image
                      src="/ap2.png"
                      alt="ANKKOR Craftsmanship"
                      width={1200}
                      height={800}
                      className="w-full h-auto shadow-lg transition-transform duration-1000 hover:scale-105"
                    />
                  </div>
                  <div className="absolute -bottom-6 right-6 bg-[#f8f8f5] text-[#2c2c27] px-6 py-4 text-sm tracking-widest uppercase border-l-2 border-[#8a8778] shadow-md">
                    Exquisite Craftsmanship
                  </div>
                </motion.div>
              </div>
              <div className="lg:col-span-5 order-2 lg:px-4">
                <motion.div 
                  className="space-y-8"
                  initial={{ opacity: 0, x: 40 }}
                  animate={inViewImages ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[#5c5c52] leading-relaxed text-lg">
                    In a world of fleeting fashion, ANKKOR stands still—rooted in sophistication, purpose, and grace. The name ANKKOR draws strength from the anchor—symbolizing durability, stability, and timeless resilience.
                  </p>
                  
                  <div className="py-4">
                    <motion.div 
                      className="w-full h-px bg-[#e5e2d9]" 
                      variants={lineReveal}
                    />
                  </div>
                  
                  <p className="text-[#5c5c52] leading-relaxed text-lg">
                    Just like an anchor holds firm amidst shifting tides, our brand is grounded in the belief that true style never fades. This philosophy carries through in every stitch of our garments—crafted with high-quality threads that mirror the strength and integrity of the symbol we stand by.
                  </p>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Quote Section */}
            <motion.div 
              className="my-32 relative py-16 px-8" 
              variants={fadeIn}
            >
              <div className="absolute left-0 top-0 w-16 h-16 border-l-2 border-t-2 border-[#8a8778]"></div>
              <div className="absolute right-0 bottom-0 w-16 h-16 border-r-2 border-b-2 border-[#8a8778]"></div>
              <blockquote className="text-2xl md:text-3xl lg:text-4xl text-[#2c2c27] font-serif text-center leading-relaxed">
                "Our designs speak the language of quiet luxury: clean cuts, refined fabrics, and enduring silhouettes."
              </blockquote>
            </motion.div>
            
            {/* Final Paragraph Section */}
            
            {/* Final Paragraph Section */}
            <motion.div 
              className="text-center space-y-8 mb-32 max-w-3xl mx-auto"
              variants={fadeIn}
            >
              <p className="text-[#5c5c52] text-xl leading-relaxed">
                ANKKOR is for those who appreciate the subtle power of understated elegance and the confidence it brings. Every piece we create is a commitment—to strength, to style, and to the timeless values of classic fashion.
              </p>
            </motion.div>
            
            {/* Founder Section */}
            <motion.div 
              className="text-center mb-32 border-t border-[#e5e2d9] pt-20"
              variants={fadeIn}
            >
              <div className="max-w-2xl mx-auto">
                <div className="relative mb-12">
                  <div className="w-32 h-32 mx-auto rounded-full border-2 border-[#8a8778]/20 flex items-center justify-center mb-8">
                    <div className="w-24 h-24 rounded-full border border-[#8a8778]/40 flex items-center justify-center">
                      <span className="font-serif text-2xl text-[#2c2c27] tracking-wider">JS</span>
                    </div>
                  </div>
                  <div className="h-px w-24 bg-[#8a8778] mx-auto mb-8"></div>
                </div>
                
                <h3 className="font-serif text-2xl md:text-3xl text-[#2c2c27] mb-4 tracking-wide">
                  Jappanjot Singh
                </h3>
                <p className="text-[#8a8778] text-lg tracking-widest uppercase font-light mb-6">
                  Founder & Chief Executive Officer
                </p>
                
                <div className="relative">
                  <div className="absolute left-0 top-0 w-8 h-8 border-l border-t border-[#8a8778]/30"></div>
                  <div className="absolute right-0 bottom-0 w-8 h-8 border-r border-b border-[#8a8778]/30"></div>
                  <p className="text-[#5c5c52] text-lg leading-relaxed italic font-serif px-8 py-6">
                    "ANKKOR was born from a belief that true elegance is timeless. In every thread we weave the story of enduring style."
                  </p>
                </div>
              </div>
            </motion.div>
            
          </motion.div>
        </div>
      </div>
    </div>
  );
}