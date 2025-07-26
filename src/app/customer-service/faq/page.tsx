'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

// FAQ Item component with accordion functionality
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-[#e5e2d9] py-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full justify-between items-center text-left"
      >
        <h3 className="text-lg font-serif text-[#2c2c27]">{question}</h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-[#8a8778]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#8a8778]" />
        )}
      </button>
      
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="pt-4 text-[#5c5c52] leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  );
};

// FAQ categories and questions
const faqData = [
  {
    category: 'Orders & Information',
    items: [
      {
        question: 'How do I place an order on ANKKOR?',
        answer: 'Placing an order is simple! Just select any product you love, choose your size and specifications, and either add it to your cart or proceed directly to checkout. Follow the steps to complete your payment at the secure gateway — and you\'re done!'
      },
      {
        question: 'Do you have a size guide?',
        answer: 'Yes, every product has a dedicated size guide available under the Product Details section. This helps you choose the perfect fit before you order.'
      },
      {
        question: 'What makes ANKKOR shirts special?',
        answer: 'Our shirts are crafted from 100% premium cotton, feature finest stitching, and are inspired by timeless old-money, vintage formal aesthetics. Each piece is made to offer elegance, class, and durability — just like an anchor.'
      },
      {
        question: 'Can I personalize my order or gift it to someone?',
        answer: 'Absolutely! We offer personalized gifting options starting from just ₹100. Whether it\'s for a friend, partner, or special occasion, we\'ve got you covered.'
      }
    ]
  },
  {
    category: 'Shipping & Delivery',
    items: [
      {
        question: 'How can I track my order?',
        answer: 'You can track your order easily on our website. Just enter your order number in the tracking section to get real-time updates on your delivery.'
      },
      {
        question: 'Do you charge extra for Cash on Delivery (COD)?',
        answer: 'Yes, there is an additional ₹50 charge for COD orders.'
      },
      {
        question: 'Do you offer free shipping?',
        answer: 'Yes, we offer free shipping on all orders above ₹2999.'
      },
      {
        question: 'How long does shipping take?',
        answer: 'Orders are typically fulfilled within 5–7 business days. Shipping charges vary based on the delivery location and will be clearly displayed at checkout.'
      }
    ]
  },
  {
    category: 'Payments & Returns',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major debit cards, credit cards, and UPI payments for a seamless checkout experience. Our transactions are securely processed through Razorpay and PayPal.'
      },
      {
        question: 'What is your return and exchange policy?',
        answer: 'If your item has a size issue or a product defect, you can request an exchange within 7 days of delivery. For other returns, we offer ANKKOR Points of equal value which you can redeem on your next purchase.'
      },
      {
        question: 'How do I initiate a return or exchange?',
        answer: 'To start an exchange, simply contact us via WhatsApp, Instagram, or our website portal. Our team will guide you through the return process. Items must be unused, unwashed, and returned in original packaging with all tags intact.'
      },
      {
        question: 'What are ANKKOR Points?',
        answer: 'ANKKOR Points are store credits that have the same value as Indian Rupees. If you choose to receive ANKKOR Points instead of a direct exchange, these points will be credited to your account once we receive and inspect your returned item.'
      }
    ]
  },
  {
    category: 'Brand & Product Information',
    items: [
      {
        question: 'What is the concept behind ANKKOR?',
        answer: 'Founded in 2025, ANKKOR emerged with a vision to revive the elegance of classic, old money formals and make them a part of everyday wear. The name ANKKOR draws strength from the anchor—symbolizing durability, stability, and timeless resilience.'
      },
      {
        question: 'What products do you currently offer?',
        answer: 'Currently, we offer formal shirts, with polos, pants, and accessories launching soon. Our products are designed for anyone who appreciates classy, old-money-inspired fashion.'
      },
      {
        question: 'How do I care for my ANKKOR shirt?',
        answer: 'Each product comes with specific care instructions. We generally recommend gentle washing with mild detergent and avoiding harsh chemicals to maintain the premium fabric quality and appearance of your ANKKOR garments.'
      },
      {
        question: 'How can I contact customer support?',
        answer: 'For any queries or assistance, you can reach us at supportankkor@gmail.com. We\'ll get back to you as soon as possible.'
      }
    ]
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#f8f8f5] py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <div className="mb-8 text-sm text-[#8a8778]">
          <Link href="/" className="hover:text-[#2c2c27] transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/customer-service" className="hover:text-[#2c2c27] transition-colors">Customer Service</Link>
          <span className="mx-2">/</span>
          <span className="text-[#2c2c27]">Frequently Asked Questions</span>
        </div>
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-serif font-bold mb-6 text-[#2c2c27]">
            Frequently Asked Questions
          </h1>
          <p className="text-[#5c5c52] leading-relaxed">
            Find answers to common questions about our products, ordering process, shipping, and returns. 
            If you can't find what you're looking for, please don't hesitate to contact our customer service team.
          </p>
        </div>
        
        {/* FAQ Content */}
        <div className="max-w-3xl mx-auto">
          {faqData.map((category, index) => (
            <div key={index} className="mb-12">
              <h2 className="text-2xl font-serif font-bold mb-6 text-[#2c2c27] border-b border-[#8a8778] pb-2">
                {category.category}
              </h2>
              <div>
                {category.items.map((item, itemIndex) => (
                  <FAQItem 
                    key={itemIndex} 
                    question={item.question} 
                    answer={item.answer} 
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Contact Section */}
        <div className="max-w-3xl mx-auto mt-16 text-center bg-[#f4f3f0] p-8 border border-[#e5e2d9]">
          <h2 className="text-2xl font-serif font-bold mb-4 text-[#2c2c27]">
            Still Have Questions?
          </h2>
          <p className="text-[#5c5c52] mb-6">
            Our customer service team is here to assist you with any inquiries not covered in our FAQ.
          </p>
          <Link 
            href="/customer-service/contact" 
            className="inline-block bg-[#2c2c27] text-[#f4f3f0] px-8 py-3 hover:bg-[#3d3d35] transition-colors text-sm tracking-wider uppercase font-medium"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
} 