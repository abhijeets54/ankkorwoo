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
      { size: 'M', measurements: ['38-40', '32-34', '34', '18', '15.5'] },
      { size: 'L', measurements: ['40-42', '34-36', '35', '18.5', '16'] },
      { size: 'XL', measurements: ['42-44', '36-38', '36', '19', '16.5'] },
      { size: 'XXL', measurements: ['44-46', '38-40', '37', '19.5', '17'] }
    ]
  };
  
  const shirtsDataCm = {
    headers: ['Chest', 'Waist', 'Sleeve Length', 'Shoulder Width', 'Neck'],
    rows: [
      { size: 'M', measurements: ['97-102', '81-86', '86', '46', '39'] },
      { size: 'L', measurements: ['102-107', '86-91', '89', '47', '41'] },
      { size: 'XL', measurements: ['107-112', '91-97', '91', '48', '42'] },
      { size: 'XXL', measurements: ['112-117', '97-102', '94', '50', '43'] }
    ]
  };
  
  // Measurement guides
  const measurementGuides: { title: string; description: string; image: string; }[] = [];
  
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
        
        {/* Fit Notes */}
        
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