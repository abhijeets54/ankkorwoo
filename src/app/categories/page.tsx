import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { getCategories } from '@/lib/woocommerce';

export const metadata: Metadata = {
  title: 'Product Categories | Ankkor',
  description: 'Browse our collection of luxury menswear categories',
};

export default async function CategoriesPage() {
  const categoriesData = await getCategories();
  const categories = categoriesData.nodes || [];
  
  // Filter out empty categories
  const nonEmptyCategories = categories.filter(category => category.count > 0);
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif text-center mb-12">Product Categories</h1>
      
      {nonEmptyCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No categories found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {nonEmptyCategories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] bg-[#f4f3f0] overflow-hidden mb-4">
                {category.image ? (
                  <Image
                    src={category.image.sourceUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#f4f3f0]">
                    <span className="text-[#8a8778] text-lg">{category.name}</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-medium text-[#2c2c27]">{category.name}</h2>
                <p className="text-[#8a8778] mt-1">{category.count} products</p>
                {category.description && (
                  <p className="text-sm text-[#5c5c52] mt-2 line-clamp-2">{category.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 