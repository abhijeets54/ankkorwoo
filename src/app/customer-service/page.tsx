'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Truck, 
  RefreshCw, 
  Ruler, 
  ShieldCheck, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';

// Service card component
const ServiceCard = ({ 
  icon: Icon, 
  title, 
  description, 
  link,
  secondaryLink
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  link: string;
  secondaryLink?: { url: string, text: string };
}) => {
  return (
    <motion.div 
      className="bg-[#f4f3f0] p-8 border border-[#e5e2d9] h-full flex flex-col"
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 text-[#8a8778]">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-serif font-bold mb-3 text-[#2c2c27]">{title}</h3>
      <p className="text-[#5c5c52] mb-6 flex-grow">{description}</p>
      <div className="flex flex-col space-y-2">
        <Link 
          href={link} 
          className="inline-flex items-center text-[#2c2c27] hover:text-[#8a8778] transition-colors gap-2 text-sm font-medium"
        >
          Learn More
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondaryLink && (
          <Link 
            href={secondaryLink.url} 
            className="inline-flex items-center text-[#5c5c52] hover:text-[#8a8778] transition-colors gap-2 text-sm"
          >
            {secondaryLink.text}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </motion.div>
  );
};

// Loading component for Suspense
const CustomerServiceLoading = () => (
  <div className="min-h-screen bg-[#f8f8f5] animate-pulse">
    <div className="h-[300px] bg-[#e5e2d9]"></div>
    <div className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="h-8 bg-[#e5e2d9] w-1/2 mx-auto mb-6"></div>
          <div className="h-4 bg-[#e5e2d9] w-full mb-2"></div>
          <div className="h-4 bg-[#e5e2d9] w-3/4 mx-auto"></div>
        </div>
      </div>
    </div>
  </div>
);

// Main content component
const CustomerServiceContent = () => {
  // Animation variants
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };
  
  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  // Service cards data
  const serviceCards = [
    {
      icon: MessageSquare,
      title: 'Contact Us',
      description: 'Reach our dedicated customer service team for personalized assistance with any inquiries or concerns.',
      link: '/customer-service/contact'
    },
    {
      icon: HelpCircle,
      title: 'FAQ',
      description: 'Find answers to commonly asked questions about our products, orders, shipping, and returns.',
      link: '/customer-service/faq'
    },
    {
      icon: Truck,
      title: 'Shipping Information',
      description: 'Learn about our shipping methods, delivery timeframes, and international shipping policies.',
      link: '/shipping-policy'
    },
    {
      icon: RefreshCw,
      title: 'Returns & Exchanges',
      description: 'Understand our hassle-free return and exchange process for a seamless shopping experience.',
      link: '/return-policy'
    },
    {
      icon: Ruler,
      title: 'Size Guide',
      description: 'Find your perfect fit with our comprehensive size charts and measurement guidelines.',
      link: '/customer-service/size-guide'
    },
    {
      icon: ShieldCheck,
      title: 'Privacy & Terms',
      description: 'Review our privacy policy and terms of service to understand how we protect your information.',
      link: '/privacy-policy',
      secondaryLink: {
        url: '/terms-of-service',
        text: 'Terms of Service'
      }
    }
  ];
  
  return (
    <div className="min-h-screen bg-[#f8f8f5]">
      {/* Hero Section */}
      <div className="relative h-[300px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1560264280-88b68371db39?q=80"
          alt="Customer Service"
          fill
          className="object-cover image-animate"
        />
        <div className="absolute inset-0 bg-[#2c2c27] bg-opacity-40 flex items-center justify-center">
          <div className="text-center text-white max-w-3xl px-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Customer Service</h1>
            <p className="text-lg max-w-2xl mx-auto">
              Dedicated to providing exceptional service and support for our valued customers
            </p>
          </div>
        </div>
      </div>
      
      {/* Service Cards Section */}
      <motion.section 
        className="py-20 px-4"
        initial="initial"
        animate="animate"
        variants={staggerChildren}
      >
        <div className="container mx-auto">
          <motion.div className="text-center max-w-3xl mx-auto mb-16" variants={fadeIn}>
            <h2 className="text-3xl font-serif font-bold mb-6 text-[#2c2c27]">
              How Can We Help You?
            </h2>
            <p className="text-[#5c5c52] leading-relaxed">
              At Ankkor, we're committed to providing exceptional customer service. 
              Browse our support resources below or contact our team directly for personalized assistance.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {serviceCards.map((card, index) => (
              <motion.div key={index} variants={fadeIn}>
                <ServiceCard 
                  icon={card.icon} 
                  title={card.title} 
                  description={card.description} 
                  link={card.link} 
                  secondaryLink={card.secondaryLink} 
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
      
      {/* Contact Banner */}
      <motion.section 
        className="py-16 px-4 bg-[#2c2c27] text-[#f4f3f0]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-serif font-bold mb-6">Need Immediate Assistance?</h2>
          <p className="text-[#d5d0c3] mb-8 max-w-2xl mx-auto">
            Our customer service team is available Monday through Friday, 9am to 6pm EST.
            We strive to respond to all inquiries within 24 hours.
          </p>
          <Link 
            href="/customer-service/contact"
            className="inline-block border border-[#8a8778] text-[#f4f3f0] px-10 py-4 hover:bg-[#3d3d35] transition-colors text-sm tracking-wider uppercase font-medium"
          >
            Contact Us
          </Link>
        </div>
      </motion.section>
      
      {/* FAQ Preview */}
      <section className="py-20 px-4 bg-[#f4f3f0]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-6 text-[#2c2c27]">
              Frequently Asked Questions
            </h2>
            <p className="text-[#5c5c52] max-w-2xl mx-auto">
              Quick answers to our most common inquiries. Visit our complete FAQ page for more information.
            </p>
          </div>
          
          <div className="space-y-6 mb-10">
            <div className="border-b border-[#e5e2d9] pb-6">
              <h3 className="text-lg font-serif text-[#2c2c27] mb-2">How long does shipping take?</h3>
              <p className="text-[#5c5c52]">
                Domestic orders typically arrive within 3-5 business days. International shipping can take 7-14 business days, 
                depending on the destination country and customs processing. For more details, visit our <Link href="/shipping-policy" className="text-[#2c2c27] underline hover:text-[#8a8778]">Shipping Policy</Link> page.
              </p>
            </div>
            
            <div className="border-b border-[#e5e2d9] pb-6">
              <h3 className="text-lg font-serif text-[#2c2c27] mb-2">What is your return policy?</h3>
              <p className="text-[#5c5c52]">
                We offer a 30-day return policy for unworn, unwashed items in their original condition with all tags attached. 
                Returns must be initiated through your account dashboard or by contacting our customer service team. Check our <Link href="/return-policy" className="text-[#2c2c27] underline hover:text-[#8a8778]">Return Policy</Link> for complete details.
              </p>
            </div>
            
            <div className="border-b border-[#e5e2d9] pb-6">
              <h3 className="text-lg font-serif text-[#2c2c27] mb-2">How do I find my correct size?</h3>
              <p className="text-[#5c5c52]">
                We provide detailed size guides for each product category. You can find these guides on product pages 
                or in our dedicated Size Guide section.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              href="/customer-service/faq"
              className="inline-block bg-[#2c2c27] text-[#f4f3f0] px-8 py-3 hover:bg-[#3d3d35] transition-colors text-sm tracking-wider uppercase font-medium"
            >
              View All FAQs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default function CustomerServicePage() {
  return (
    <Suspense fallback={<CustomerServiceLoading />}>
      <CustomerServiceContent />
    </Suspense>
  );
} 