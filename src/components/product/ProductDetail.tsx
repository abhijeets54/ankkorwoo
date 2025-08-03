'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocalCartStore } from '@/lib/localCartStore';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/cart/CartProvider';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useProductStockUpdates } from '@/hooks/useStockUpdates';

interface ProductDetailProps {
  product: any;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const cartStore = useLocalCartStore();
  const { openCart } = useCart();

  // Extract product data
  const {
    id,
    databaseId,
    name,
    description,
    shortDescription,
    price,
    regularPrice,
    onSale,
    stockStatus,
    image,
    galleryImages,
    attributes,
    type,
    variations
  } = product;

  // Real-time stock updates
  const { stockData, isConnected } = useProductStockUpdates(databaseId?.toString() || '', true);

  // Use real-time stock data if available, otherwise fall back to product data
  const currentStockStatus = stockData.stockStatus || stockStatus;
  const currentStockQuantity = stockData.stockQuantity;
  
  // Determine if product is a variable product
  const isVariableProduct = type === 'VARIABLE';
  
  // Format product images for display
  const productImages = [
    image?.sourceUrl ? { sourceUrl: image.sourceUrl, altText: image.altText || name } : null,
    ...(galleryImages?.nodes || [])
  ].filter(Boolean);
  
  // Handle quantity changes
  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  
  // Handle attribute selection
  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
    
    // Find matching variant if all attributes are selected
    if (isVariableProduct && variations?.nodes) {
      const updatedAttributes = {
        ...selectedAttributes,
        [attributeName]: value
      };
      
      // Check if all required attributes are selected
      const allAttributesSelected = attributes?.nodes?.every(
        (attr: any) => updatedAttributes[attr.name]
      );
      
      if (allAttributesSelected) {
        // Find matching variant
        const matchingVariant = variations.nodes.find((variant: any) => {
          return variant.attributes.nodes.every((attr: any) => {
            const selectedValue = updatedAttributes[attr.name];
            return attr.value === selectedValue;
          });
        });
        
        if (matchingVariant) {
          setSelectedVariant(matchingVariant);
        } else {
          setSelectedVariant(null);
        }
      }
    }
  };
  
  // Handle add to cart
  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    
    try {
      const productToAdd = {
        productId: databaseId.toString(),
        quantity,
        name,
        price: selectedVariant?.price || price,
        image: {
          url: productImages[0]?.sourceUrl || '',
          altText: productImages[0]?.altText || name
        }
      };
      
      await cartStore.addToCart(productToAdd);
      openCart();
    } catch (error) {
      console.error('Error adding product to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  // Check if product is out of stock (use real-time data if available)
  const isOutOfStock = (currentStockStatus || stockStatus) !== 'IN_STOCK' &&
                       (currentStockStatus || stockStatus) !== 'instock';
  
  // Check if product can be added to cart (has all required attributes selected for variable products)
  const canAddToCart = !isVariableProduct || (isVariableProduct && selectedVariant);
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-6">
          {/* Main Image */}
          <div className="relative aspect-square bg-[#f4f3f0] overflow-hidden">
            {productImages[selectedImage]?.sourceUrl && (
              <Image
                src={productImages[selectedImage].sourceUrl}
                alt={productImages[selectedImage].altText || name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className="object-cover"
              />
            )}
          </div>
          
          {/* Thumbnail Gallery */}
          {productImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {productImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square bg-[#f4f3f0] ${
                    selectedImage === index ? 'ring-2 ring-[#2c2c27]' : ''
                  }`}
                >
                  <Image
                    src={img.sourceUrl}
                    alt={img.altText || `${name} - Image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 20vw, 10vw"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Product Information */}
        <div className="space-y-6">
          <h1 className="text-3xl font-serif text-[#2c2c27]">{name}</h1>
          
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-medium text-[#2c2c27]">
              {(selectedVariant?.price || price).toString().includes('₹') || (selectedVariant?.price || price).toString().includes('$') || (selectedVariant?.price || price).toString().includes('€') || (selectedVariant?.price || price).toString().includes('£')
                ? (selectedVariant?.price || price)
                : `₹${selectedVariant?.price || price}`}
            </span>

            {onSale && regularPrice && (
              <span className="text-sm line-through text-[#8a8778]">
                {regularPrice.toString().includes('₹') || regularPrice.toString().includes('$') || regularPrice.toString().includes('€') || regularPrice.toString().includes('£')
                  ? regularPrice
                  : `₹${regularPrice}`}
              </span>
            )}
          </div>
          
          {/* Short Description */}
          {shortDescription && (
            <div 
              className="prose prose-sm text-[#5c5c52]"
              dangerouslySetInnerHTML={{ __html: shortDescription }}
            />
          )}
          
          {/* Attributes/Variations */}
          {isVariableProduct && attributes?.nodes && (
            <div className="space-y-4">
              {attributes.nodes.map((attribute: any) => (
                <div key={attribute.name} className="space-y-2">
                  <h3 className="font-medium text-[#2c2c27]">{attribute.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {attribute.options.map((option: string) => (
                      <button
                        key={option}
                        onClick={() => handleAttributeChange(attribute.name, option)}
                        className={`px-4 py-2 border ${
                          selectedAttributes[attribute.name] === option
                            ? 'border-[#2c2c27] bg-[#2c2c27] text-white'
                            : 'border-gray-300 hover:border-[#8a8778]'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Quantity Selector */}
          <div className="flex items-center space-x-4">
            <span className="text-[#5c5c52]">Quantity:</span>
            <div className="flex items-center border border-gray-300">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="px-3 py-2 hover:bg-gray-100"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
              <button
                onClick={incrementQuantity}
                className="px-3 py-2 hover:bg-gray-100"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Stock Status */}
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Availability: </span>
              <span className={isOutOfStock ? 'text-red-600' : 'text-green-600'}>
                {isOutOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>
            {/* Show stock quantity if available */}
            {currentStockQuantity !== undefined && currentStockQuantity !== null && (
              <div className="text-xs text-gray-600 mt-1">
                {currentStockQuantity > 0 ? (
                  <span>{currentStockQuantity} items available</span>
                ) : (
                  <span className="text-red-600">No items in stock</span>
                )}
              </div>
            )}
            {/* Show last update time */}
            {stockData.lastUpdated && (
              <div className="text-xs text-gray-500 mt-1">
                Last updated: {new Date(stockData.lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
          
          {/* Add to Cart Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAddingToCart || !canAddToCart}
              className="w-full py-6 bg-[#2c2c27] text-white hover:bg-[#3c3c37] flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-5 w-5" />
              {isAddingToCart ? 'Adding...' : 'Add to Cart'}
            </Button>
            
            {isVariableProduct && !canAddToCart && !isOutOfStock && (
              <p className="mt-2 text-sm text-red-600">
                Please select all options to add this product to your cart
              </p>
            )}
          </motion.div>
          
          {/* Full Description */}
          {description && (
            <div className="mt-12 border-t border-gray-200 pt-8">
              <h2 className="text-xl font-serif mb-4 text-[#2c2c27]">Description</h2>
              <div 
                className="prose prose-sm text-[#5c5c52]"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail; 