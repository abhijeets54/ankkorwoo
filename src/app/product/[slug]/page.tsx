import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlugWithTags } from '@/lib/woocommerce';
import ProductDetail from '@/components/product/ProductDetail';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = params;
  
  try {
    const product = await getProductBySlugWithTags(slug);
    
    if (!product) {
      return {
        title: 'Product Not Found | Ankkor',
        description: 'The requested product could not be found.'
      };
    }
    
    return {
      title: `${product.name} | Ankkor`,
      description: product.shortDescription || product.description || 'Luxury menswear from Ankkor.',
      openGraph: {
        images: product.image ? [{ url: product.image.sourceUrl, alt: product.name }] : []
      }
    };
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return {
      title: 'Product | Ankkor',
      description: 'Luxury menswear from Ankkor.'
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = params;
  
  try {
    const product = await getProductBySlugWithTags(slug);
    
    if (!product) {
      notFound();
    }
    
    return <ProductDetail product={product} />;
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }
} 