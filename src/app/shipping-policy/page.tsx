'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Truck, PackageCheck, Clock } from 'lucide-react';

export default function ShippingPolicyPage() {
  return (
    <div className="bg-[#f8f8f5] min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-[#2c2c27] h-[30vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#2c2c27]/90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556740758-90de374c12ad?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="container mx-auto px-4 text-center relative z-10"
        >
          <h1 className="font-serif text-4xl md:text-5xl text-[#f8f8f5] mb-4">Shipping Policy</h1>
          <div className="h-[1px] w-24 bg-[#8a8778] mx-auto mb-4"></div>
          <p className="text-[#e5e2d9] max-w-2xl mx-auto">Your order's journey from our atelier to your doorstep</p>
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
                At ANKKOR, we're committed to delivering your orders swiftly and seamlessly across India. All orders are processed immediately upon confirmation, ensuring the quickest possible dispatch.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-16">
              <div className="bg-[#f4f3f0] p-8 border border-[#e5e2d9] text-center">
                <div className="flex justify-center mb-4">
                  <Truck className="w-8 h-8 text-[#8a8778]" />
                </div>
                <h3 className="font-serif text-lg text-[#2c2c27] mb-2">Trusted Partners</h3>
                <p className="text-sm">
                  We ship exclusively within India using our trusted logistics partners.
                </p>
              </div>
              
              <div className="bg-[#f4f3f0] p-8 border border-[#e5e2d9] text-center">
                <div className="flex justify-center mb-4">
                  <Clock className="w-8 h-8 text-[#8a8778]" />
                </div>
                <h3 className="font-serif text-lg text-[#2c2c27] mb-2">Delivery Timeframe</h3>
                <p className="text-sm">
                  Once shipped, your order typically arrives within 5 to 7 business days, depending on your location.
                </p>
              </div>
              
              <div className="bg-[#f4f3f0] p-8 border border-[#e5e2d9] text-center">
                <div className="flex justify-center mb-4">
                  <PackageCheck className="w-8 h-8 text-[#8a8778]" />
                </div>
                <h3 className="font-serif text-lg text-[#2c2c27] mb-2">Order Tracking</h3>
                <p className="text-sm">
                  You will receive a tracking link via email or WhatsApp once your order is on its way.
                </p>
              </div>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Shipping Charges
            </h2>
            <p className="mb-6">
              Shipping charges are calculated at checkout based on the delivery address and order size. We offer free shipping on all orders above ₹2999.
            </p>
            
            <div className="overflow-x-auto mb-12 border border-[#e5e2d9]">
              <table className="w-full border-collapse">
                <thead className="bg-[#f4f3f0]">
                  <tr>
                    <th className="py-3 px-4 text-left font-serif text-[#2c2c27] border-b border-[#e5e2d9]">Order Value</th>
                    <th className="py-3 px-4 text-left font-serif text-[#2c2c27] border-b border-[#e5e2d9]">Shipping Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#e5e2d9]">
                    <td className="py-3 px-4">Below ₹2999</td>
                    <td className="py-3 px-4">As per delivery location</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">₹2999 and above</td>
                    <td className="py-3 px-4 font-medium">FREE</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Order Tracking
            </h2>
            <p className="mb-6">
              You can monitor your delivery in real-time using the tracking link provided via email or WhatsApp. Our system updates automatically as your package moves through different stages of the delivery process.
            </p>
            
            <div className="bg-[#f4f3f0] p-8 border-l-4 border-[#8a8778] my-12">
              <h3 className="font-serif text-xl text-[#2c2c27] mb-3">Cash on Delivery</h3>
              <p className="mb-0">
                We offer Cash on Delivery (COD) option with an additional ₹50 charge.
              </p>
            </div>
            
            <h2 className="font-serif text-2xl text-[#2c2c27] mt-12 mb-4 flex items-center">
              <span className="h-px w-10 bg-[#8a8778] mr-4"></span>
              Customer Support
            </h2>
            <p className="mb-10">
              If you have any questions or experience delays, our support team is always ready to help via supportankkor@gmail.com
            </p>
            
            <div className="flex flex-col md:flex-row md:justify-between items-center mt-16 pt-8 border-t border-[#e5e2d9]">
              <p className="text-sm text-[#8a8778] mb-4 md:mb-0">Last Updated: April 2025</p>
              <div className="flex space-x-4">
                <Link href="/terms-of-service" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy-policy" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/return-policy" className="text-sm text-[#2c2c27] hover:text-[#8a8778] transition-colors">
                  Return Policy
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 