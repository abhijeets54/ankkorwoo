'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImageLoader from '@/components/ui/ImageLoader';

export default function SustainabilityPage() {
  return (
    <div className="bg-[#f8f8f5]">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <ImageLoader
            src="https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?q=80&w=2070"
            alt="Sustainable fabric production"
            fill
            sizes="100vw"
            className="h-full"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2c2c27]/30 to-[#2c2c27]/70" />
        </div>
        <div className="container mx-auto px-4 h-full flex items-end pb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#f4f3f0] mb-6">
              Our Commitment to Sustainability
            </h1>
            <p className="text-[#e5e2d9] text-lg md:text-xl max-w-2xl">
              At Ankkor, we believe that true luxury must be responsible. Our commitment to sustainability guides every decision we make.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Philosophy Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2c2c27] mb-6">Our Philosophy</h2>
            <p className="text-[#5c5c52] text-lg leading-relaxed">
              Sustainability at Ankkor isn't just about using eco-friendly materials—it's a holistic approach that encompasses ethical production, fair labor practices, and a commitment to reducing our environmental footprint at every stage of our process.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="font-serif text-2xl text-[#2c2c27] mb-4">Quality Over Quantity</h3>
              <p className="text-[#5c5c52] mb-6">
                We believe that the most sustainable garment is one that lasts. By creating timeless pieces of exceptional quality, we encourage a shift away from fast fashion toward a more thoughtful approach to consumption.
              </p>
              <p className="text-[#5c5c52]">
                Our garments are designed to be worn for years, even decades, improving with age and wear. This philosophy of longevity is at the core of our sustainability efforts—creating less waste by making products that don't need frequent replacement.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden"
            >
              <ImageLoader
                src="https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?q=80&w=1974"
                alt="Sustainable fabric production"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-full"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sustainable Materials Section */}
      <section className="py-20 bg-[#f4f3f0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2c2c27] mb-6">Sustainable Materials</h2>
            <p className="text-[#5c5c52] text-lg">
              We carefully select materials that minimize environmental impact without compromising on quality or performance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Organic Cotton",
                description: "Our cotton is GOTS-certified organic, grown without synthetic pesticides or fertilizers. This reduces water usage by up to 90% compared to conventional cotton and eliminates harmful chemicals from the production process.",
                image: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=2071"
              },
              {
                title: "Responsible Wool",
                description: "We source our wool exclusively from farms certified by the Responsible Wool Standard, ensuring animal welfare, land management, and social responsibility throughout the supply chain.",
                image: "https://images.unsplash.com/photo-1599749001441-8e42a614af8d?q=80&w=2070"
              },
              {
                title: "Natural Dyes",
                description: "Whenever possible, we use plant-based dyes derived from roots, bark, leaves, and flowers. These natural alternatives reduce water pollution and create rich, complex colors that synthetic dyes cannot replicate.",
                image: "https://images.unsplash.com/photo-1576513652242-636c50e94b4d?q=80&w=2070"
              }
            ].map((material, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="bg-[#f8f8f5] rounded-lg overflow-hidden shadow-sm"
              >
                <div className="h-64 relative">
                  <ImageLoader
                    src={material.image}
                    alt={material.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="h-full"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl text-[#2c2c27] mb-3">{material.title}</h3>
                  <p className="text-[#5c5c52]">{material.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ethical Production Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2c2c27] mb-6">Ethical Production</h2>
            <p className="text-[#5c5c52] text-lg">
              We believe that how our garments are made is just as important as what they're made from.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-2 md:order-1 relative h-[400px] md:h-[500px] rounded-lg overflow-hidden"
            >
              <ImageLoader
                src="https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?q=80&w=2070"
                alt="Artisan workshop"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-full"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-1 md:order-2"
            >
              <h3 className="font-serif text-2xl text-[#2c2c27] mb-4">Fair Labor Practices</h3>
              <p className="text-[#5c5c52] mb-6">
                All Ankkor garments are produced in workshops that meet our strict standards for worker welfare, including fair wages, safe working conditions, and reasonable hours. We maintain direct relationships with our manufacturing partners and conduct regular audits to ensure compliance.
              </p>
              <p className="text-[#5c5c52]">
                We believe in transparency throughout our supply chain. Each Ankkor garment includes a code that allows customers to trace its journey from raw material to finished product, including information about the artisans involved in its creation.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Initiatives Section */}
      <section className="py-20 bg-[#2c2c27] text-[#f4f3f0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl mb-6">Our Initiatives</h2>
            <p className="text-[#d5d0c3] text-lg">
              Beyond our core production practices, we're committed to making a positive impact through these key initiatives.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Zero Waste Pattern Cutting",
                description: "Our pattern-making process is designed to minimize fabric waste. Any remnants are repurposed into smaller accessories or donated to textile recycling programs.",
                icon: <Check className="h-6 w-6 text-[#8a8778]" />
              },
              {
                title: "Carbon Offset Program",
                description: "We calculate and offset the carbon footprint of our operations, including shipping, by investing in verified reforestation and renewable energy projects.",
                icon: <Check className="h-6 w-6 text-[#8a8778]" />
              },
              {
                title: "Repair Program",
                description: "We offer complimentary repairs for the lifetime of our garments, extending their usable life and reducing the need for replacement.",
                icon: <Check className="h-6 w-6 text-[#8a8778]" />
              },
              {
                title: "Artisan Training",
                description: "We invest in the next generation of craftspeople through our apprenticeship program, preserving traditional techniques while creating sustainable employment opportunities.",
                icon: <Check className="h-6 w-6 text-[#8a8778]" />
              }
            ].map((initiative, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="bg-[#3d3d35] p-6 rounded-lg"
              >
                <div className="flex items-start">
                  <div className="mr-4 mt-1">{initiative.icon}</div>
                  <div>
                    <h3 className="font-serif text-xl mb-2">{initiative.title}</h3>
                    <p className="text-[#d5d0c3]">{initiative.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2c2c27] mb-6">Join Us on Our Journey</h2>
            <p className="text-[#5c5c52] text-lg mb-8">
              Sustainability is a continuous process of improvement. We invite you to be part of our journey toward a more responsible future.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild>
                <Link href="/collection" className="flex items-center">
                  Shop Responsibly <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/about/craftsmanship">
                  Explore Our Craftsmanship
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 