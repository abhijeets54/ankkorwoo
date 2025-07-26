'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import ContactForm from '@/components/contact/ContactForm';

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-serif text-4xl font-bold text-[#2c2c27]">
          Contact Us
        </h1>
        <p className="mx-auto max-w-2xl text-[#5c5c52]">
          We're here to assist you with any questions or concerns. Please feel free to reach out to us using the form below or through our contact information.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Contact Form */}
        <div className="flex-1">
          <h2 className="mb-8 border-b border-[#e5e2d9] pb-4 font-serif text-2xl font-bold text-[#2c2c27]">
            Send Us a Message
          </h2>
          
          <ContactForm />
        </div>

        {/* Contact Information */}
        <div className="w-full lg:w-96">
          <h2 className="mb-8 border-b border-[#e5e2d9] pb-4 font-serif text-2xl font-bold text-[#2c2c27]">
            Contact Information
          </h2>
          
          <div className="space-y-8">
            <div className="flex items-start">
              <Mail className="mr-4 h-5 w-5 text-[#8a8778]" />
              <div>
                <h3 className="mb-4 font-serif text-xl font-bold text-[#2c2c27]">
                  Email Us
                </h3>
                <p className="mb-1 text-[#5c5c52]">
                  <a href="mailto:help.ankkor@gmail.com" className="hover:text-[#2c2c27] hover:underline">
                    help.ankkor@gmail.com
                  </a>
                </p>
                <p className="text-[#5c5c52]">
                  {/* <a href="mailto:orders@ankkor.com" className="hover:text-[#2c2c27] hover:underline">
                    orders@ankkor.com
                  </a> */}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="mr-4 h-5 w-5 text-[#8a8778]" />
              <div>
                <h3 className="mb-4 font-serif text-xl font-bold text-[#2c2c27]">
                  Call Us
                </h3>
                <p className="mb-1 text-[#5c5c52]">
                  <a href="tel:+91 9815319207" className="hover:text-[#2c2c27] hover:underline">
                    +91 9815319207
                  </a>
                </p>
                <p className="text-sm text-[#8a8778]">
                  Monday to Friday, 10am - 6pm IST
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="mr-4 h-5 w-5 text-[#8a8778]" />
              <div>
                <h3 className="mb-4 font-serif text-xl font-bold text-[#2c2c27]">
                  Operational Address:
                </h3>
                <p className="mb-1 text-[#5c5c52]">
                  163/A Jagdish Nagar, St. 5 Avtar Market, Dugri Road
                </p>
                <p className="text-[#5c5c52]">
                Ludhiana
141013, Punjab, India
                </p>
              </div>
            </div>

             
            
            <div className="flex items-start">
              <Clock className="mr-4 h-5 w-5 text-[#8a8778]" />
              <div>
                <h3 className="mb-4 font-serif text-xl font-bold text-[#2c2c27]">
                  Business Hours
                </h3>
                <p className="mb-1 text-[#5c5c52]">
                  Orders: 24*7
                </p>
              </div>
            </div>
          </div>
          
          {/* Store Image */}
          <div className="mt-10 overflow-hidden rounded-lg">
            <Image
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80"
              alt="Ankkor Store"
              width={400}
              height={300}
              className="h-auto w-full image-animate transition-all duration-700"
            />
          </div>
        </div>
      </div>
      
      {/* FAQ Link */}
      <div className="mt-16 border-t border-[#e5e2d9] pt-12 text-center">
        <h3 className="mb-4 font-serif text-2xl font-bold text-[#2c2c27]">
          Have Questions?
        </h3>
        <p className="mb-6 text-[#5c5c52]">
          Check our frequently asked questions for quick answers to common inquiries.
        </p>
        <Link
          href="/customer-service/faq"
          className="inline-block border border-[#2c2c27] px-8 py-3 text-sm uppercase tracking-wider text-[#2c2c27] transition-colors hover:bg-[#f4f3f0]"
        >
          View FAQ
        </Link>
      </div>
    </div>
  );
} 