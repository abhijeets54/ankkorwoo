'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImageLoader from '@/components/ui/ImageLoader';

export default function CraftsmanshipPage() {
  return (
    <div className="bg-[#f8f8f5]">
      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <ImageLoader
            src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=2070"
            alt="Artisan crafting a garment"
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
              The Art of Craftsmanship
            </h1>
            <p className="text-[#e5e2d9] text-lg md:text-xl max-w-2xl">
              Every Ankkor garment is a testament to time-honored techniques, meticulous attention to detail, and an unwavering commitment to excellence.
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
              At Ankkor, we believe that true luxury lies not in ostentatious displays, but in the quiet excellence of perfectly executed craftsmanship. Each garment we create is designed to stand the test of time—both in style and durability—becoming more personal and characterful with each wear.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="font-serif text-2xl text-[#2c2c27] mb-4">Artisanal Excellence</h3>
              <p className="text-[#5c5c52] mb-6">
                Our master craftspeople average over 15 years of experience in their specialized fields. Many have trained under generational artisans who have preserved techniques dating back centuries. This wealth of knowledge and skill is evident in every stitch, seam, and finish.
              </p>
              <p className="text-[#5c5c52]">
                We maintain small production runs to ensure each garment receives the attention it deserves. Our artisans take pride in their work, signing each piece they complete—a testament to their confidence in the quality of their craftsmanship.
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
                src="https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1935"
                alt="Artisan hands working on fabric"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-full"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Process Section */}
      <section className="py-20 bg-[#f4f3f0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2c2c27] mb-6">Our Process</h2>
            <p className="text-[#5c5c52] text-lg">
              From initial design to final stitch, our meticulous process ensures that every Ankkor garment meets our exacting standards.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Design & Pattern Making",
                description: "Our designs begin with hand sketches that are refined into precise patterns. Each pattern is tested and adjusted multiple times to achieve the perfect fit and silhouette.",
                image: "https://images.unsplash.com/photo-1621786030333-c411f490d6e7?q=80&w=1974"
              },
              {
                title: "Material Selection",
                description: "We source the finest natural fabrics from heritage mills in Italy, Japan, and the UK. Each material is carefully selected for its quality, texture, and performance characteristics.",
                image: "https://images.unsplash.com/photo-1558304970-abd589baebe5?q=80&w=1976"
              },
              {
                title: "Hand Construction",
                description: "Many elements of our garments are constructed by hand, including collar shaping, buttonholes, and finishing details. This approach allows for greater precision and a superior finish.",
                image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070"
              }
            ].map((step, index) => (
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
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="h-full"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl text-[#2c2c27] mb-3">{step.title}</h3>
                  <p className="text-[#5c5c52]">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Signature Techniques Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2c2c27] mb-6">Signature Techniques</h2>
            <p className="text-[#5c5c52] text-lg">
              Discover the specialized techniques that set Ankkor garments apart and contribute to their exceptional quality and longevity.
            </p>
          </motion.div>

          <div className="space-y-16">
            {[
              {
                title: "Single-Needle Stitching",
                description: "While more time-consuming, our single-needle stitching creates cleaner seams with greater durability and a more refined appearance. This technique is particularly evident in our shirt collars and cuffs.",
                image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=2070",
                reverse: false
              },
              {
                title: "Hand-Rolled Hems",
                description: "The edges of our finest shirts feature hand-rolled hems, a technique that creates a subtle ripple effect along the edge. This method requires significant skill but results in a more elegant drape and greater durability.",
                image: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=2070",
                reverse: true
              },
              {
                title: "Full Canvas Construction",
                description: "Our jackets utilize full canvas construction, where the internal structure is hand-stitched rather than fused. This allows the garment to mold to your body over time, creating a personalized fit that improves with wear.",
                image: "https://images.unsplash.com/photo-1519238360766-1a3905508e25?q=80&w=2069",
                reverse: false
              }
            ].map((technique, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${technique.reverse ? 'md:flex-row-reverse' : ''}`}
              >
                <div className={`order-2 ${technique.reverse ? 'md:order-1' : 'md:order-2'}`}>
                  <div className="relative h-[300px] md:h-[400px] rounded-lg overflow-hidden">
                    <ImageLoader
                      src={technique.image}
                      alt={technique.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="h-full"
                    />
                  </div>
                </div>
                <div className={`order-1 ${technique.reverse ? 'md:order-2' : 'md:order-1'}`}>
                  <h3 className="font-serif text-2xl text-[#2c2c27] mb-4">{technique.title}</h3>
                  <p className="text-[#5c5c52]">{technique.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Artisans Section */}
      {/* <section className="py-20 bg-[#2c2c27] text-[#f4f3f0]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl mb-6">Meet Our Artisans</h2>
            <p className="text-[#d5d0c3] text-lg">
              Behind every Ankkor garment is a team of dedicated artisans who bring decades of experience and passion to their craft.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marco Bianchi",
                role: "Master Tailor",
                bio: "With over 30 years of experience, Marco leads our tailoring team. Trained in Naples, he specializes in traditional Italian construction techniques.",
                image: "https://images.unsplash.com/photo-1507680434567-5739c80be1ac?q=80&w=2070"
              },
              {
                name: "Sophia Chen",
                role: "Pattern Maker",
                bio: "Sophia combines traditional pattern-making with innovative techniques to create our signature silhouettes. Her attention to proportion and fit is unmatched.",
                image: "https://images.unsplash.com/photo-1573497161161-c3e73707e25c?q=80&w=2070"
              },
              {
                name: "James Harrison",
                role: "Fabric Specialist",
                bio: "James works directly with mills to develop exclusive fabrics for Ankkor. His knowledge of textiles ensures we use only the finest materials.",
                image: "https://images.unsplash.com/photo-1567784177951-6fa58317e16b?q=80&w=2070"
              }
            ].map((artisan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="bg-[#3d3d35] rounded-lg overflow-hidden"
              >
                <div className="h-64 relative">
                  <ImageLoader
                    src={artisan.image}
                    alt={artisan.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="h-full"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl mb-1">{artisan.name}</h3>
                  <p className="text-[#8a8778] mb-3">{artisan.role}</p>
                  <p className="text-[#d5d0c3]">{artisan.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

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
            <h2 className="font-serif text-3xl md:text-4xl text-[#2c2c27] mb-6">Experience the Difference</h2>
            <p className="text-[#5c5c52] text-lg mb-8">
              Discover the exceptional quality and craftsmanship of Ankkor garments for yourself.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild>
                <Link href="/collection" className="flex items-center">
                  Explore Collection <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/about/sustainability">
                  Our Sustainability Commitment
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 