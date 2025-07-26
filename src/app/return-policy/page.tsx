'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { RefreshCw, Package, AlertCircle } from 'lucide-react';

export default function ReturnPolicyPage() {
  return (
    <div className="bg-[#f8f8f5] min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-[#2c2c27] h-[30vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#2c2c27]/90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="container mx-auto px-4 text-center relative z-10"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-[#f8f8f5] mb-4">Return Policy</h1>
          <div className="h-[1px] w-24 bg-[#8a8778] mx-auto mb-4"></div>
          <p className="text-[#e5e2d9] max-w-2xl mx-auto">Our commitment to your complete satisfaction</p>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="prose prose-lg max-w-none text-[#5c5c52]">
            <div className="mb-12 p-8 bg-[#f4f3f0] border-l-4 border-[#8a8778]">
              <p className="italic text-[#2c2c27]">
                At ANKKOR, customer satisfaction is our priority. If your order doesn't meet expectations, we offer a 7-day exchange policy to ensure you're completely happy with your purchase.
              </p>
            </div>
            
            <div className="flex justify-center my-12">
              <div className="w-20 h-20 bg-[#f4f3f0] rounded-full flex items-center justify-center shadow-sm border border-[#e5e2d9]">
                <RefreshCw className="w-8 h-8 text-[#8a8778]" />
              </div>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Exchange Eligibility
            </h2>
            <p className="mb-6">
              To qualify for an exchange, items must be unused, unwashed, and returned in original packaging with all tags intact. You must initiate the exchange within 7 days of receiving the product. Items that are worn, damaged, or missing tags will not be accepted.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
              <div className="bg-[#f4f3f0] p-6 border border-[#e5e2d9]">
                <div className="flex items-center mb-4">
                  <Package className="w-5 h-5 text-[#8a8778] mr-3" />
                  <h3 className="font-serif text-lg text-[#2c2c27]">Exchange Options</h3>
                </div>
                <p className="text-sm mb-3">We currently do not offer refunds. Instead, customers can:</p>
                <ul className="list-disc pl-6 text-sm">
                  <li className="mb-2">Exchange the product for a different size or item</li>
                  <li>Receive ANKKOR Points of equal value, which can be redeemed on future purchases via our website</li>
                </ul>
              </div>
              
              <div className="bg-[#f4f3f0] p-6 border border-[#e5e2d9]">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-5 h-5 text-[#8a8778] mr-3" />
                  <h3 className="font-serif text-lg text-[#2c2c27]">Non-Exchangeable Items</h3>
                </div>
                <p className="text-sm mb-3">Certain products may be non-returnable, including:</p>
                <ul className="list-disc pl-6 text-sm">
                  <li className="mb-2">Accessories</li>
                  <li className="mb-2">Discounted items</li>
                  <li>Custom-made pieces (if applicable)</li>
                </ul>
                <p className="text-sm mt-3">These exceptions will be clearly stated on their respective product pages.</p>
              </div>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Exchange Process
            </h2>
            <p className="mb-6">
              To start an exchange, simply contact us via WhatsApp, Instagram, or our website portal. Our team will guide you through the return process.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              ANKKOR Points
            </h2>
            <p className="mb-6">
              If you choose to receive ANKKOR Points instead of a direct exchange, these points will be credited to your account once we receive and inspect your returned item. Points have the same value as Indian Rupees and can be used for future purchases on our website.
            </p>
            
            <div className="bg-[#f4f3f0] p-8 border-l-4 border-[#8a8778] my-12">
              <h3 className="font-serif text-xl text-[#2c2c27] mb-3">Quality Assurance</h3>
              <p className="mb-0">
                Each ANKKOR product undergoes rigorous quality checks before dispatch. If you receive a product with manufacturing defects, please contact us immediately with photos of the issue, and we'll prioritize your exchange.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row md:justify-between items-center mt-16 pt-8 border-t border-[#e5e2d9]">
              <p className="text-sm text-[#8a8778] mb-4 md:mb-0">Last Updated: April 2025</p>
              <div className="flex space-x-4">
                <Link href="/terms-of-service" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy-policy" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/shipping-policy" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                  Shipping Policy
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 