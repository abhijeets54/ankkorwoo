import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProducts, getCategories } from '@/lib/woocommerce';
import ProductGrid from '@/components/product/ProductGrid';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = params;
  
  // Fetch categories to find the current one
  const categoriesData = await getCategories();
  const category = categoriesData.nodes?.find((cat) => cat.slug === slug);
  
  if (!category) {
    return {
      title: 'Category Not Found | Ankkor',
      description: 'The requested category could not be found.'
    };
  }
  
  return {
    title: `${category.name} | Ankkor`,
    description: category.description || `Browse our collection of ${category.name.toLowerCase()} products.`
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = params;
  
  // Fetch categories to find the current one
  const categoriesData = await getCategories();
  const category = categoriesData.nodes?.find((cat) => cat.slug === slug);
  
  if (!category) {
    notFound();
  }
  
  // Fetch products for this category
  const productsData = await getProducts({
    first: 12,
    where: {
      categoryIn: [category.slug]
    }
  });
  
  const products = productsData.nodes || [];
  
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-serif text-[#2c2c27] mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-[#8a8778] max-w-2xl mx-auto">{category.description}</p>
        )}
        <p className="text-[#5c5c52] mt-2">{category.count} products</p>
      </header>
      
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              {/* You would normally use your ProductCard component here */}
              <a href={`/product/${product.slug}`} className="block">
                {product.image && (
                  <div className="relative aspect-square bg-[#f4f3f0] overflow-hidden mb-4">
                    <img 
                      src={product.image.sourceUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h3 className="text-lg font-medium">{product.name}</h3>
                <p className="text-gray-600">${parseFloat(product.price).toFixed(2)}</p>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 