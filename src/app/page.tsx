'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Shirt, ShoppingBag, Scissors, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/product/ProductCard';
import ImageLoader from '@/components/ui/ImageLoader';
import usePageLoading from '@/hooks/usePageLoading';
import { getAllProducts, normalizeProduct, getMetafield, normalizeProductImages } from '@/lib/woocommerce';
import { Skeleton } from '@/components/ui/skeleton';
import FashionLoader from '@/components/ui/FashionLoader';
import BannerSlider from '@/components/home/BannerSlider';
import NewsletterPopup from '@/components/home/NewsletterPopup';
import LaunchingSoon from '@/components/home/LaunchingSoon';
import { getCurrencySymbol } from '@/lib/productUtils';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch products from WooCommerce
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('Fetching products for homepage...');
        const products = await getAllProducts(8); // Fetch 8 products
        
        if (!products || products.length === 0) {
          console.warn('No products returned from WooCommerce');
          setError('We\'re experiencing technical difficulties. Please try again later.');
          setIsLoading(false);
          return;
        }
        
        console.log(`Fetched ${products.length} products from WooCommerce`);
        
        // Normalize the products and sort by newest first
        const normalizedProducts = products
          .map((product: any) => {
            const normalizedProduct = normalizeProduct(product);
            // Ensure currencyCode is included for use with currency symbols
            if (normalizedProduct) {
              normalizedProduct.currencyCode = 'INR'; // Default to INR or get from WooCommerce settings
            }
            return normalizedProduct;
          })
          .filter(Boolean)
          .sort((a, b) => {
            // Sort by newest first - compare IDs or creation dates
            const aDate = a._originalWooProduct?.dateCreated || a._originalWooProduct?.date_created || a.id;
            const bDate = b._originalWooProduct?.dateCreated || b._originalWooProduct?.date_created || b.id;
            
            // If we have actual dates, compare them
            if (aDate && bDate && aDate !== a.id && bDate !== b.id) {
              return new Date(bDate).getTime() - new Date(aDate).getTime();
            }
            
            // Fallback to ID comparison (higher IDs are typically newer)
            return b.id.localeCompare(a.id);
          });
        
        console.log('Normalized products:', normalizedProducts);
        setFeaturedProducts(normalizedProducts);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('We\'re experiencing technical difficulties. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Use the page loading hook
  usePageLoading(isLoading, 'thread');
  
  // Enhanced animation variants
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };
  
  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const slideIn = {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.9, ease: "easeOut" } }
  };

  const scaleIn = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: "easeOut" } }
  };


  return (
    <div className="min-h-screen bg-[#f8f8f5]">
      {/* Launch Soon Overlay */}
      <LaunchingSoon />

      {/* Newsletter Popup */}
      <NewsletterPopup />

      {/* Banner Slider */}
      <BannerSlider />
      
      {/* Hero Section - Refined */}
      <section className="pt-36 pb-20 px-4 bg-gradient-to-b from-[#f4f3f0] to-[#f8f8f5]">
        <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between">
          <motion.div 
            className="lg:w-1/2"
            variants={slideIn}
            initial="initial"
            animate="animate"
          >
            <p className="text-[#8a8778] text-lg mb-5 font-light tracking-widest uppercase">
              Timeless Distinction
            </p>
            <h1 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-8 text-[#2c2c27]">
              Elevated essentials <br />for the discerning gentleman
            </h1>
            <p className="text-[#5c5c52] mb-8 leading-relaxed max-w-lg">
              Impeccably tailored garments crafted from the finest materials, designed to stand the test of time with understated elegance.
            </p>
            <motion.button 
              onClick={() => {}}
              className="bg-[#2c2c27] text-[#f4f3f0] px-10 py-4 hover:bg-[#3d3d35] transition-colors flex items-center gap-3 text-sm tracking-wider uppercase font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/collection">
                Explore Collection
                <span className="inline-block text-lg font-light">→</span>
              </Link>
            </motion.button>
          </motion.div>
          <motion.div 
            className="lg:w-1/2 mt-12 lg:mt-0 relative"
            variants={scaleIn}
            initial="initial"
            animate="animate"
          >
            <div className="absolute -z-10 top-0 right-0 w-80 h-80 bg-[#e0ddd3] rounded-full opacity-40 blur-3xl"></div>
            <div className="absolute -z-10 bottom-0 right-20 w-64 h-64 bg-[#d5d0c3] rounded-full opacity-30 blur-3xl"></div>
            <Image
              src="/hero.jpg"
              alt="Ankkor Classic Style"
              width={600}
              height={800}
              className="rounded-sm shadow-lg relative z-10 image-animate border border-[#e5e2d9]"
            />
            <div className="absolute -bottom-6 -left-6 bg-[#2c2c27] text-[#f4f3f0] py-4 px-8 text-sm tracking-wider uppercase z-20 hidden md:block">
              Est. 2025
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Products - Now with real WooCommerce data */}
      <motion.section 
        className="py-24 px-4"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerChildren}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-5 text-[#2c2c27]">Signature Pieces</h2>
            <p className="text-[#5c5c52] max-w-2xl mx-auto">
              Our most distinguished garments, selected for their exceptional quality and timeless appeal
            </p>
          </div>
          
          
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <FashionLoader 
                size="lg" 
                variant="thread" 
                className="min-h-[200px]" 
                text="Loading Products"
              />
            </div>
          )}

          {error && !isLoading && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-serif text-[#2c2c27] mb-4">Service Temporarily Unavailable</h3>
                <p className="text-[#5c5c52] mb-6">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-[#2c2c27] text-white px-6 py-2 hover:bg-[#3d3d35] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {!isLoading && !error && featuredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => {
                const originalProduct = product._originalWooProduct;
                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.title}
                    price={originalProduct?.salePrice || originalProduct?.price || product.priceRange?.minVariantPrice?.amount || '0'}
                    image={product.images[0]?.url || ''}
                    slug={product.handle}
                    material={getMetafield(product, 'custom_material', undefined, product.vendor || 'Premium Fabric')}
                    isNew={true}
                    stockStatus={originalProduct?.stockStatus || "IN_STOCK"}
                    compareAtPrice={product.compareAtPrice}
                    regularPrice={originalProduct?.regularPrice}
                    salePrice={originalProduct?.salePrice}
                    onSale={originalProduct?.onSale || false}
                    currencySymbol={getCurrencySymbol(product.currencyCode)}
                    currencyCode={product.currencyCode || 'INR'}
                    shortDescription={originalProduct?.shortDescription}
                    type={originalProduct?.type}
                  />
                );
              })}
            </div>
          )}

          {!isLoading && !error && featuredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#5c5c52]">No products available at the moment.</p>
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link 
              href="/collection"
              className="inline-flex items-center text-[#2c2c27] hover:text-[#8a8778] transition-colors"
            >
              View Full Collection
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Polos Coming Soon Section - Commented out as per request
      <motion.section 
        className="py-24 px-4 bg-[#f4f3f0]"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        <div className="container mx-auto">
          <div className="relative h-[400px] overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1627225924765-552d49cf47ad?q=80"
              alt="Ankkor Polos Coming Soon"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[#2c2c27] bg-opacity-60 flex items-center justify-center">
              <div className="text-center max-w-2xl px-4">
                <p className="text-[#8a8778] text-sm mb-4 tracking-widest uppercase">Coming Soon</p>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">
                  Refined Polos for the Modern Gentleman
                </h2>
                <p className="text-[#d5d0c3] mb-8 text-lg">
                  Experience the perfect blend of comfort and sophistication with our upcoming collection of premium polos.
                </p>
                <Link href="/collection/polos">
                  <motion.button 
                    className="border border-[#8a8778] text-white px-8 py-3 hover:bg-[#3d3d35] transition-colors text-sm tracking-wider uppercase font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Preview Collection
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      */}

      {/* Brand Story Section - Premium Aesthetic */}
      <motion.section 
        className="py-24 px-4 bg-[#f4f3f0]"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerChildren}
      >
        <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            className="lg:w-1/2 relative"
            variants={fadeIn}
          >
            <div className="absolute -inset-4 border border-[#8a8778] -z-10 opacity-40"></div>
            <Image
              src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=2944&auto=format&fit=crop"
              alt="Ankkor Premium Shirt"
              width={600}
              height={600}
              sizes="(max-width: 768px) 100vw, 600px"
              className="w-full h-[600px] object-cover image-animate border border-[#e5e2d9] transition-all duration-700"
              priority
            />
            <div className="absolute -bottom-6 -right-6 bg-[#2c2c27] text-[#f4f3f0] py-3 px-6 text-xs tracking-widest uppercase">
              Est. 2025
            </div>
          </motion.div>
          
          <motion.div 
            className="lg:w-1/2 space-y-8"
            variants={fadeIn}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px w-12 bg-[#8a8778]"></div>
              <p className="text-[#8a8778] text-sm tracking-widest uppercase">Our Heritage</p>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#2c2c27] mb-8">ANKKOR – The Anchor of Timeless Style</h2>
            
            <div className="space-y-6 text-[#5c5c52] leading-relaxed">
              <p>
                Founded in 2025, ANKKOR emerged with a vision: to revive the elegance of classic, old money formals and make them a part of everyday wear. In a world of fleeting fashion, ANKKOR stands still—rooted in sophistication, purpose, and grace.
              </p>
              
              <div className="h-px w-full bg-[#e5e2d9]"></div>
              
              <p>
                The name ANKKOR draws strength from the anchor—symbolizing durability, stability, and timeless resilience. Just like an anchor holds firm amidst shifting tides, our brand is grounded in the belief that true style never fades. This philosophy carries through in every stitch of our garments—crafted with high-quality threads that mirror the strength and integrity of the symbol we stand by.
              </p>
              
              <p>
                Our designs speak the language of quiet luxury: clean cuts, refined fabrics, and enduring silhouettes. ANKKOR is for those who appreciate the subtle power of understated elegance and the confidence it brings.
              </p>
              
              <p>
                Every piece we create is a commitment—to strength, to style, and to the timeless values of classic fashion.
              </p>
            </div>
            
            <div className="pt-6">
              <p className="font-serif text-xl text-[#2c2c27] italic">
                ANKKOR – Where class meets character. Wear timeless. Be anchored.
              </p>
              
              <div className="mt-10">
                <Link
                  href="/about"
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-[#2c2c27] border border-[#2c2c27] hover:bg-[#2c2c27] hover:text-white transition-colors"
                >
                  Read more
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="15px" width="15px" className="ml-2">
                    <path strokeLinejoin="round" strokeLinecap="round" strokeMiterlimit={10} strokeWidth="1.5" stroke="currentColor" d="M8.91016 19.9201L15.4302 13.4001C16.2002 12.6301 16.2002 11.3701 15.4302 10.6001L8.91016 4.08008" />
                  </svg>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Newsletter Section - Enhanced */}
      {/* <motion.section 
        className="py-20 px-4 bg-[#faf9f6] border-y border-[#e5e2d9]"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        <div className="container mx-auto max-w-xl text-center">
          <p className="text-[#8a8778] text-sm mb-3 tracking-widest uppercase">Stay Informed</p>
          <h2 className="text-3xl font-serif font-bold mb-4 text-[#2c2c27]">Join the Ankkor Circle</h2>
          <p className="text-[#5c5c52] mb-8">
            Subscribe to receive private collection previews, styling insights from our master tailors, 
            and exclusive invitations to Ankkor events.
          </p>
          
          <div className="flex gap-0 max-w-md mx-auto overflow-hidden border border-[#c5c2b9]">
            <Input 
              placeholder="Enter your email" 
              className="flex-1 border-none focus:ring-0 bg-transparent text-[#2c2c27] placeholder-[#8a8778]" 
            />
            <Button className="bg-[#2c2c27] hover:bg-[#3d3d35] rounded-none px-6">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[#8a8778] text-xs mt-4">
            By subscribing, you agree to receive Ankkor communications and accept our Privacy Policy
          </p>
        </div>
      </motion.section> */}

      {/* Shopping Experience - Enhanced */}
      <motion.section 
        className="py-24 px-4 bg-[#f0ede6]"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerChildren}
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center max-w-xl mx-auto mb-16" variants={fadeIn}>
            <p className="text-[#8a8778] text-sm mb-3 tracking-widest uppercase">Our Promise</p>
            <h2 className="text-3xl font-serif font-bold mb-4 text-[#2c2c27]">
              The Ankkor Distinction
            </h2>
            <p className="text-[#5c5c52]">
              We uphold the highest standards in every aspect of our craft, 
              ensuring an exceptional experience with every garment
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <motion.div 
              className="text-center space-y-5"
              variants={fadeIn}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#faf9f6] w-20 h-20 mx-auto rounded-none flex items-center justify-center shadow-sm border border-[#e5e2d9]">
                <ShoppingBag className="w-8 h-8 text-[#2c2c27]" />
              </div>
              <h3 className="font-serif font-semibold text-lg text-[#2c2c27]">Curated Selection</h3>
              <p className="text-[#5c5c52] text-sm">
                Each piece is meticulously selected to ensure exceptional quality and enduring style
              </p>
            </motion.div>
            
            <motion.div 
              className="text-center space-y-5"
              variants={fadeIn}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#faf9f6] w-20 h-20 mx-auto rounded-none flex items-center justify-center shadow-sm border border-[#e5e2d9]">
                <Shirt className="w-8 h-8 text-[#2c2c27]" />
              </div>
              <h3 className="font-serif font-semibold text-lg text-[#2c2c27]">Master Tailoring</h3>
              <p className="text-[#5c5c52] text-sm">
                Precision craftsmanship ensuring impeccable fit, superior comfort, and distinctive character
              </p>
            </motion.div>

            <motion.div 
              className="text-center space-y-5"
              variants={fadeIn}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#faf9f6] w-20 h-20 mx-auto rounded-none flex items-center justify-center shadow-sm border border-[#e5e2d9]">
                <Scissors className="w-8 h-8 text-[#2c2c27]" />
              </div>
              <h3 className="font-serif font-semibold text-lg text-[#2c2c27]">Exceptional Materials</h3>
              <p className="text-[#5c5c52] text-sm">
                Sourced from heritage mills with centuries of tradition and uncompromising standards
              </p>
            </motion.div>

            <motion.div 
              className="text-center space-y-5"
              variants={fadeIn}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#faf9f6] w-20 h-20 mx-auto rounded-none flex items-center justify-center shadow-sm border border-[#e5e2d9]">
                <Check className="w-8 h-8 text-[#2c2c27]" />
              </div>
              <h3 className="font-serif font-semibold text-lg text-[#2c2c27]">Client Dedication</h3>
              <p className="text-[#5c5c52] text-sm">
                Personalized attention and service that honors the tradition of bespoke craftsmanship
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer Callout - New */}
      <motion.section
        className="py-24 px-4 bg-[#2c2c27] text-[#f4f3f0] relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#8a8778] to-transparent opacity-40"></div>
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-4xl font-serif font-bold mb-6">Experience Ankkor</h2>
          <p className="text-[#d5d0c3] mb-10 max-w-2xl mx-auto">
            Visit our flagship boutique for a personalized styling consultation 
            with our master tailors, or explore our collection online.
          </p>
          <Link href="/collection">
            <motion.button 
              className="border border-[#8a8778] text-[#f4f3f0] px-10 py-4 hover:bg-[#3d3d35] transition-colors text-sm tracking-wider uppercase font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Shop the Collection
            </motion.button>
          </Link>
        </div>
        <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-[#8a8778] to-transparent opacity-40"></div>
      </motion.section>
    </div>
  );
}
