'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, Lock } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[#f8f8f5] min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-[#2c2c27] h-[30vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#2c2c27]/90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="container mx-auto px-4 text-center relative z-10"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-[#f8f8f5] mb-4">Privacy Policy</h1>
          <div className="h-[1px] w-24 bg-[#8a8778] mx-auto mb-4"></div>
          <p className="text-[#e5e2d9] max-w-2xl mx-auto">How we protect and respect your personal information</p>
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
                At ANKKOR, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you interact with us.
              </p>
            </div>
            
            <div className="flex items-center justify-center my-10">
              <div className="w-16 h-16 bg-[#f4f3f0] rounded-full flex items-center justify-center shadow-sm border border-[#e5e2d9]">
                <Lock className="w-7 h-7 text-[#8a8778]" />
              </div>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Information We Collect
            </h2>
            <p className="mb-6">
              When you shop with us or engage through our platforms, we may collect your name, address, contact number, email ID, and payment details. This information is used solely to process your order, communicate updates, and provide customer support.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Third-Party Services
            </h2>
            <p className="mb-6">
              We work with trusted third-party services like Razorpay and PayPal for payments, and DTDC and Dehlivery for logistics. These partners receive only the necessary information required to complete transactions or fulfill deliveries.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-16">
              <div className="bg-[#f4f3f0] p-6 border border-[#e5e2d9]">
                <div className="flex items-center mb-4">
                  <Shield className="w-5 h-5 text-[#8a8778] mr-3" />
                  <h3 className="font-serif text-lg text-[#2c2c27]">Your Data Privacy</h3>
                </div>
                <p className="text-sm">
                  We respect your privacy and do not sell, rent, or share your personal data with external marketing agencies or unrelated third parties.
                </p>
              </div>
              
              <div className="bg-[#f4f3f0] p-6 border border-[#e5e2d9]">
                <div className="flex items-center mb-4">
                  <Shield className="w-5 h-5 text-[#8a8778] mr-3" />
                  <h3 className="font-serif text-lg text-[#2c2c27]">Data Storage</h3>
                </div>
                <p className="text-sm">
                  Your data is stored securely using industry-standard practices. While we take all reasonable precautions, no system is completely immune to risks.
                </p>
              </div>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Your Rights
            </h2>
            <p className="mb-6">
              You have the right to access, update, or request deletion of your data. If you'd like to know what information we have on file or want to opt out of communications, please reach out to us.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Cookies
            </h2>
            <p className="mb-6">
              We may use cookies to enhance your experience on our website. You can manage your preferences through your browser settings.
            </p>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Policy Updates
            </h2>
            <p className="mb-6">
              This policy may be updated from time to time. Continued use of our website implies acceptance of the most current version.
            </p>
            
            <div className="mt-16 pt-6 border-t border-[#e5e2d9]">
              <h3 className="font-serif text-xl text-[#2c2c27] mb-4">Contact Us</h3>
              <p className="mb-4">
                If you have any concerns or queries regarding our privacy practices, feel free to contact us at:
              </p>
              <p className="mb-8">
                <strong>Email:</strong> supportankkor@gmail.com
              </p>
              
              <div className="flex flex-col md:flex-row md:justify-between items-center mt-8 pt-8 border-t border-[#e5e2d9]">
                <p className="text-sm text-[#8a8778] mb-4 md:mb-0">Last Updated: April 2025</p>
                <div className="flex space-x-4">
                  <Link href="/terms-of-service" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                    Terms of Service
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