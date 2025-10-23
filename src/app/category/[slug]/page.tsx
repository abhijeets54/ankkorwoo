'use client';

import React, { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getProducts, getCategories } from '@/lib/woocommerce';
import ProductGrid from '@/components/product/ProductGrid';
import ProductCard from '@/components/product/ProductCard';
import { useQuickView } from '@/hooks/useQuickView';
import QuickViewModal from '@/components/product/QuickViewModal';

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [category, setCategory] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { product: quickViewProduct, isOpen: isQuickViewOpen, openQuickView, closeQuickView } = useQuickView();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch categories to find the current one
        const categoriesData = await getCategories();
        const foundCategory = categoriesData.nodes?.find((cat: any) => cat.slug === slug);

        if (!foundCategory) {
          setIsLoading(false);
          return;
        }

        setCategory(foundCategory);

        // Fetch products for this category
        const productsData = await getProducts({
          first: 12,
          where: {
            categoryIn: [foundCategory.slug]
          }
        });

        setProducts(productsData.nodes || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching category data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-[#5c5c52]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-[#5c5c52]">Category not found.</p>
        </div>
      </div>
    );
  }
  
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
            <ProductCard
              key={product.id}
              id={product.databaseId.toString()}
              name={product.name}
              price={product.price || '0'}
              image={product.image?.sourceUrl || ''}
              slug={product.slug}
              stockStatus={product.stockStatus || "IN_STOCK"}
              stockQuantity={product.stockQuantity}
              regularPrice={product.regularPrice}
              salePrice={product.salePrice}
              onSale={product.onSale || false}
              shortDescription={product.shortDescription}
              type={product.type}
              product={product}
              showSizeSelector={true}
              onQuickView={() => openQuickView(product)}
            />
          ))}
        </div>
      )}

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={closeQuickView}
      />
    </div>
  );
} 