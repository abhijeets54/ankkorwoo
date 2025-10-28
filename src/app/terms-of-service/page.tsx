'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Anchor } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="bg-[#f8f8f5] min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-[#2c2c27] h-[30vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#2c2c27]/90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?q=80&w=2673&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="container mx-auto px-4 text-center relative z-10"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-[#f8f8f5] mb-4">Terms of Service</h1>
          <div className="h-[1px] w-24 bg-[#8a8778] mx-auto mb-4"></div>
          <p className="text-[#e5e2d9] max-w-2xl mx-auto">Our commitment to transparency and fairness</p>
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
                Welcome to ANKKOR. These Terms of Service outline the rules and regulations for using our website and services. By placing an order or interacting with us on our website, WhatsApp, or Instagram, you agree to the following terms.
              </p>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              About ANKKOR
            </h2>
            <p className="mb-6">
              ANKKOR is a formal clothing and accessories brand based in Ludhiana, Punjab. Our products are designed for anyone who appreciates classy, old-money-inspired fashion. Currently, we offer formal shirts, with polos, pants, and accessories launching soon.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Eligibility & Ordering
            </h2>
            <p className="mb-6">
              You must be at least 18 years old to place an order. If you're under 18, please use the platform under parental guidance. Orders can be placed through our website, WhatsApp, or Instagram. We accept both prepaid and cash-on-delivery (COD) payments, with secure transactions powered by Razorpay and PayPal.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Shipping & Delivery
            </h2>
            <p className="mb-6">
              We deliver across India through our shipping partners. Orders are typically fulfilled within 5–7 business days. Shipping charges vary based on the delivery location and will be clearly displayed at checkout.
            </p>
            
            <div className="my-16 border-t border-b border-[#e5e2d9] py-8 px-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 rounded-full border border-[#8a8778] flex items-center justify-center">
                  <Anchor className="h-6 w-6 text-[#8a8778]" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-center text-lg font-serif italic text-[#2c2c27]">
                "ANKKOR – Where class meets character. Wear timeless. Be anchored."
              </p>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Exchange Policy
            </h2>
            <p className="mb-6">
              Our exchange policy allows for a 7-day window from the date of delivery. Products must be unused and returned in their original packaging. We do not offer refunds; however, customers can choose to exchange the item or receive the value as redeemable ANKKOR Points through our website.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Platform Usage & Conduct
            </h2>
            <p className="mb-6">
              All users are expected to use the platform respectfully. Any misuse, including spamming, fraudulent returns, or unauthorized resale, may result in restricted access to our services. The content, designs, and brand identity of ANKKOR are protected by intellectual property rights. Reproduction or use of any material without written permission is strictly prohibited.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Limitation of Liability
            </h2>
            <p className="mb-6">
              While we aim to provide timely service, we are not liable for delays caused by third-party service providers or unforeseen events. ANKKOR reserves the right to suspend or terminate any user account in case of policy violations.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Governing Law
            </h2>
            <p className="mb-6">
              All transactions and disputes are governed by Indian laws under the jurisdiction of Ludhiana, Punjab.
            </p>
            
            <div className="mt-16 pt-8 border-t border-[#e5e2d9]">
              <div className="flex flex-col md:flex-row md:justify-between items-center">
                <p className="text-sm text-[#8a8778] mb-4 md:mb-0">Last Updated: April 2025</p>
                <div className="flex space-x-4">
                  <Link href="/privacy-policy" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/shipping-policy" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                    Shipping Policy
                  </Link>
                  <Link href="/return-policy" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                    Return Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 