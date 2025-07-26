'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Ruler, Info } from 'lucide-react';

// Size table component
const SizeTable = ({ 
  title, 
  headers, 
  rows, 
  units 
}: { 
  title: string; 
  headers: string[]; 
  rows: { size: string; measurements: string[] }[];
  units: string;
}) => {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-serif font-bold text-[#2c2c27]">{title}</h3>
        <span className="text-sm text-[#8a8778]">Measurements in {units}</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f4f3f0]">
              <th className="border border-[#e5e2d9] py-3 px-4 text-left text-[#2c2c27] font-medium">Size</th>
              {headers.map((header, index) => (
                <th key={index} className="border border-[#e5e2d9] py-3 px-4 text-left text-[#2c2c27] font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#faf9f6]'}>
                <td className="border border-[#e5e2d9] py-3 px-4 font-medium text-[#2c2c27]">{row.size}</td>
                {row.measurements.map((measurement, cellIndex) => (
                  <td key={cellIndex} className="border border-[#e5e2d9] py-3 px-4 text-[#5c5c52]">
                    {measurement}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// How to measure guide component
const MeasurementGuide = ({ 
  title, 
  description, 
  image 
}: { 
  title: string; 
  description: string; 
  image: string;
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 mb-8 items-center">
      <div className="md:w-1/3 relative h-[200px] w-full">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover image-animate"
        />
      </div>
      <div className="md:w-2/3">
        <h4 className="text-lg font-serif font-bold mb-2 text-[#2c2c27]">{title}</h4>
        <p className="text-[#5c5c52]">{description}</p>
      </div>
    </div>
  );
};

export default function SizeGuidePage() {
  const [activeUnit, setActiveUnit] = useState<'inches' | 'cm'>('inches');
  
  // Size data
  const shirtsDataInches = {
    headers: ['Chest', 'Waist', 'Sleeve Length', 'Shoulder Width', 'Neck'],
    rows: [
      { size: 'XS', measurements: ['34-36', '28-30', '32', '17', '14.5'] },
      { size: 'S', measurements: ['36-38', '30-32', '33', '17.5', '15'] },
      { size: 'M', measurements: ['38-40', '32-34', '34', '18', '15.5'] },
      { size: 'L', measurements: ['40-42', '34-36', '35', '18.5', '16'] },
      { size: 'XL', measurements: ['42-44', '36-38', '36', '19', '16.5'] },
      { size: 'XXL', measurements: ['44-46', '38-40', '37', '19.5', '17'] }
    ]
  };
  
  const shirtsDataCm = {
    headers: ['Chest', 'Waist', 'Sleeve Length', 'Shoulder Width', 'Neck'],
    rows: [
      { size: 'XS', measurements: ['86-91', '71-76', '81', '43', '37'] },
      { size: 'S', measurements: ['91-97', '76-81', '84', '44', '38'] },
      { size: 'M', measurements: ['97-102', '81-86', '86', '46', '39'] },
      { size: 'L', measurements: ['102-107', '86-91', '89', '47', '41'] },
      { size: 'XL', measurements: ['107-112', '91-97', '91', '48', '42'] },
      { size: 'XXL', measurements: ['112-117', '97-102', '94', '50', '43'] }
    ]
  };
  
  // Measurement guides
  const measurementGuides = [
    {
      title: 'Chest',
      description: 'Measure around the fullest part of your chest, keeping the tape measure horizontal and under your arms.',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80'
    },
    {
      title: 'Waist',
      description: 'Measure around your natural waistline, which is located above your hip bones and below your ribcage. Keep the tape measure snug but not tight.',
      image: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80'
    },
    {
      title: 'Sleeve Length',
      description: 'Measure from the center back of your neck, across your shoulder, and down to your wrist. Keep your arm slightly bent.',
      image: 'https://images.unsplash.com/photo-1594938298613-c9546b6f6c51?q=80'
    },
    {
      title: 'Inseam',
      description: 'Measure from the crotch seam to the bottom of the leg. For the most accurate measurement, use a pair of pants that fit you well.',
      image: 'https://images.unsplash.com/photo-1584865288642-42078afe6942?q=80'
    }
  ];
  
  // Animation variants
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };
  
  return (
    <div className="min-h-screen bg-[#f8f8f5] py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <div className="mb-8 text-sm text-[#8a8778]">
          <Link href="/" className="hover:text-[#2c2c27] transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/customer-service" className="hover:text-[#2c2c27] transition-colors">Customer Service</Link>
          <span className="mx-2">/</span>
          <span className="text-[#2c2c27]">Size Guide</span>
        </div>
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-serif font-bold mb-6 text-[#2c2c27]">
            Size Guide
          </h1>
          <p className="text-[#5c5c52] leading-relaxed">
            Find your perfect fit with our comprehensive size charts. If you're between sizes, 
            we recommend sizing up for a more comfortable fit or contacting our customer service 
            team for personalized assistance.
          </p>
        </div>
        
        {/* Unit Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex border border-[#e5e2d9] rounded-none overflow-hidden">
            <button
              onClick={() => setActiveUnit('inches')}
              className={`px-6 py-2 text-sm ${
                activeUnit === 'inches'
                  ? 'bg-[#2c2c27] text-[#f4f3f0]'
                  : 'bg-[#f4f3f0] text-[#2c2c27] hover:bg-[#e5e2d9]'
              } transition-colors`}
            >
              Inches
            </button>
            <button
              onClick={() => setActiveUnit('cm')}
              className={`px-6 py-2 text-sm ${
                activeUnit === 'cm'
                  ? 'bg-[#2c2c27] text-[#f4f3f0]'
                  : 'bg-[#f4f3f0] text-[#2c2c27] hover:bg-[#e5e2d9]'
              } transition-colors`}
            >
              Centimeters
            </button>
          </div>
        </div>
        
        {/* Size Tables */}
        <div className="mb-16">
          <SizeTable
            title="Shirts"
            headers={activeUnit === 'inches' ? shirtsDataInches.headers : shirtsDataCm.headers}
            rows={activeUnit === 'inches' ? shirtsDataInches.rows : shirtsDataCm.rows}
            units={activeUnit}
          />
        </div>
        
        {/* How to Measure */}
        <div className="bg-[#f4f3f0] p-8 border border-[#e5e2d9] mb-16">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="h-5 w-5 text-[#8a8778]" />
              <h2 className="text-2xl font-serif font-bold text-[#2c2c27]">How to Measure</h2>
            </div>
            <p className="text-[#5c5c52]">
              For the most accurate measurements, we recommend having someone else measure you. 
              Wear lightweight clothing and stand straight with your feet together.
            </p>
          </div>
          
          <div className="space-y-10">
            {measurementGuides.map((guide, index) => (
              <MeasurementGuide
                key={index}
                title={guide.title}
                description={guide.description}
                image={guide.image}
              />
            ))}
          </div>
        </div>
        
        {/* Fit Notes */}
        <div className="bg-white p-8 border border-[#e5e2d9] mb-16">
          <div className="flex items-start gap-3 mb-6">
            <div className="text-[#8a8778] mt-1">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold mb-4 text-[#2c2c27]">Fit Notes</h2>
              <p className="text-[#5c5c52] mb-4">
                At Ankkor, we offer the following fits across our collection:
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-serif font-bold mb-2 text-[#2c2c27]">Classic Fit</h3>
              <p className="text-[#5c5c52]">
                Our most generous fit, designed for comfort with a relaxed silhouette. 
                Classic fit shirts have a fuller cut through the chest and waist.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-serif font-bold mb-2 text-[#2c2c27]">Tailored Fit</h3>
              <p className="text-[#5c5c52]">
                A refined silhouette that's trimmer than our Classic fit but not overly slim. 
                Tailored fit offers a clean, modern profile without being restrictive.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-serif font-bold mb-2 text-[#2c2c27]">Slim Fit</h3>
              <p className="text-[#5c5c52]">
                Our most fitted silhouette, cut close to the body for a contemporary look. 
                Slim fit shirts are narrower through the chest and waist with higher armholes.
              </p>
            </div>
          </div>
        </div>
        
        {/* Contact Section */}
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold mb-4 text-[#2c2c27]">
            Need Additional Assistance?
          </h2>
          <p className="text-[#5c5c52] mb-6 max-w-2xl mx-auto">
            If you have any questions about sizing or need personalized recommendations, 
            our customer service team is here to help.
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