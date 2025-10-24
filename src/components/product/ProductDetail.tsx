'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocalCartStore } from '@/lib/localCartStore';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/cart/CartProvider';
import { Minus, Plus, ShoppingBag, AlertCircle, Info } from 'lucide-react';
import { useSimpleStockUpdates } from '@/hooks/useSimpleStockUpdates';
import SizeSelector from './SizeSelector';
import { SizeAttributeProcessor, ProductSizeInfo } from '@/lib/sizeAttributeProcessor';
import { toast } from 'react-hot-toast';
import StockBadge from './StockBadge';

interface ProductDetailProps {
  product: any;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sizeInfo, setSizeInfo] = useState<ProductSizeInfo | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [currentRegularPrice, setCurrentRegularPrice] = useState<string>('');
  const [currentSalePrice, setCurrentSalePrice] = useState<string>('');
  const [currentOnSale, setCurrentOnSale] = useState<boolean>(false);
  const [sizeError, setSizeError] = useState<string>('');
  
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
  const stockData = useSimpleStockUpdates(databaseId?.toString() || '', {
    stockStatus: stockStatus,
    availableForSale: stockStatus === 'IN_STOCK'
  });

  // Use real-time stock data if available, otherwise fall back to product data
  const currentStockStatus = stockData.stockStatus || stockStatus;
  const currentStockQuantity = stockData.stockQuantity;
  
  // Determine if product is a variable product
  const isVariableProduct = type === 'VARIABLE';

  // Process size information
  useEffect(() => {
    if (product) {
      const extractedSizeInfo = SizeAttributeProcessor.extractSizeAttributes(product);
      setSizeInfo(extractedSizeInfo);
      
      // Set default size if available
      if (extractedSizeInfo.hasSizes && extractedSizeInfo.defaultSize && !selectedSize) {
        setSelectedSize(extractedSizeInfo.defaultSize);
      }
      
      // Initialize pricing
      setCurrentPrice(price || '0');
      setCurrentRegularPrice(regularPrice || '0');
      setCurrentSalePrice(product.salePrice || '');
      setCurrentOnSale(onSale || false);
    }
  }, [product, price, regularPrice, onSale, selectedSize]);

  // Update pricing when size changes
  useEffect(() => {
    if (product && selectedSize && sizeInfo?.hasSizes) {
      const sizePricing = SizeAttributeProcessor.getSizePricing(product, selectedSize);
      if (sizePricing) {
        setCurrentPrice(sizePricing.price);
        setCurrentRegularPrice(sizePricing.regularPrice);
        setCurrentSalePrice(sizePricing.salePrice);
        setCurrentOnSale(sizePricing.onSale);
      }
    }
  }, [product, selectedSize, sizeInfo]);
  
  // Format product images for display
  const productImages = [
    image?.sourceUrl ? { sourceUrl: image.sourceUrl, altText: image.altText || name } : null,
    ...(galleryImages?.nodes || [])
  ].filter(Boolean);

  // Enhanced stock management - Define stockQuantity first
  const stockQuantity = currentStockQuantity || product.stockQuantity;
  const isOutOfStock = (currentStockStatus || stockStatus) !== 'IN_STOCK' &&
                       (currentStockStatus || stockStatus) !== 'instock' ||
                       stockQuantity === 0;
  const isLowStock = stockQuantity !== undefined && stockQuantity > 0 && stockQuantity <= 5;

  // Get available stock quantity for current selection
  const getAvailableStock = (): number | undefined => {
    // For variable products with size selection
    if (sizeInfo?.hasSizes && selectedSize) {
      const selectedSizeInfo = sizeInfo.availableSizes.find(s => s.value === selectedSize);
      return selectedSizeInfo?.stockQuantity;
    }

    // For variable products with variant selection
    if (selectedVariant?.stockQuantity !== undefined) {
      return selectedVariant.stockQuantity;
    }

    // For simple products
    return stockQuantity;
  };

  const availableStock = getAvailableStock();

  // Handle quantity changes with stock validation
  const incrementQuantity = () => {
    setQuantity(prev => {
      if (availableStock !== undefined && prev >= availableStock) {
        toast.error(`Only ${availableStock} items available in stock`);
        return prev;
      }
      return prev + 1;
    });
  };

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

  // Handle size selection
  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setSizeError(''); // Clear any size errors
    
    // Update selected attributes for compatibility with existing logic
    if (sizeInfo?.hasSizes) {
      const sizeAttributeName = sizeInfo.availableSizes[0]?.name || 'Size';
      setSelectedAttributes(prev => ({
        ...prev,
        [sizeAttributeName]: size
      }));
      
      // Find matching variant
      if (variations?.nodes) {
        const matchingVariant = SizeAttributeProcessor.findVariationBySize(
          variations.nodes,
          size,
          sizeAttributeName
        );
        setSelectedVariant(matchingVariant);
      }
    }
  };
  
  // Handle add to cart with size validation and real-time stock check
  const handleAddToCart = async () => {
    // Validate size selection for variable products with sizes
    if (sizeInfo?.hasSizes && !selectedSize) {
      setSizeError('Please select a size');
      toast.error('Please select a size before adding to cart');
      return;
    }

    // Validate size availability
    if (sizeInfo?.hasSizes && selectedSize && product) {
      const validation = SizeAttributeProcessor.validateSizeSelection(product, selectedSize);
      if (!validation.isValid || !validation.isAvailable) {
        setSizeError(validation.error || 'Selected size is not available');
        toast.error(validation.error || 'Selected size is not available');
        return;
      }
    }

    setIsAddingToCart(true);
    setSizeError(''); // Clear any previous errors

    try {
      // Find variation ID if size is selected
      let variationId: string | undefined;
      let variationDatabaseId: string | undefined;
      if (selectedSize && sizeInfo?.hasSizes) {
        const variation = SizeAttributeProcessor.findVariationBySize(
          variations?.nodes || [],
          selectedSize
        );
        variationId = variation?.id;
        variationDatabaseId = variation?.databaseId?.toString();
      }

      // Real-time stock validation before adding to cart
      const { validateStockBeforeAddToCart } = await import('@/lib/woocommerce');

      const stockValidation = await validateStockBeforeAddToCart({
        productId: databaseId.toString(),
        variationId: variationDatabaseId,
        requestedQuantity: quantity
      });

      if (!stockValidation.isValid) {
        toast.error(stockValidation.message || 'This product is out of stock');

        // If there's a capped quantity available, offer to add that amount instead
        if (stockValidation.cappedQuantity && stockValidation.cappedQuantity > 0) {
          setQuantity(stockValidation.cappedQuantity);
          toast.success(`Quantity adjusted to available stock: ${stockValidation.cappedQuantity}`);
        }

        setIsAddingToCart(false);
        return;
      }

      const productToAdd = {
        productId: databaseId.toString(),
        quantity,
        name,
        price: currentPrice || selectedVariant?.price || price,
        image: {
          url: productImages[0]?.sourceUrl || '',
          altText: productImages[0]?.altText || name
        },
        // Add size information to cart item
        attributes: selectedSize ? [{
          name: 'Size',
          value: selectedSize
        }] : undefined,
        variationId
      };

      await cartStore.addToCart(productToAdd);

      // Show success message
      const sizeText = selectedSize ? ` (Size: ${selectedSize})` : '';
      toast.success(`${name}${sizeText} added to cart!`);

      openCart();
    } catch (error) {
      console.error('Error adding product to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Check if product can be added to cart (has all required attributes selected for variable products)
  const canAddToCart = (() => {
    // Simple products can always be added to cart (if in stock)
    if (!isVariableProduct) return true;
    
    // Variable products with sizes need size selection
    if (sizeInfo?.hasSizes && !selectedSize) return false;
    
    // Variable products need all attributes selected (legacy logic)
    if (isVariableProduct && !selectedVariant && !sizeInfo?.hasSizes) return false;
    
    return true;
  })();
  
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
              {currentPrice.toString().includes('₹') || currentPrice.toString().includes('$') || currentPrice.toString().includes('€') || currentPrice.toString().includes('£')
                ? currentPrice
                : `₹${currentPrice}`}
            </span>

            {onSale && regularPrice && (
              <span className="text-sm line-through text-[#8a8778]">
                {regularPrice.toString().includes('₹') || regularPrice.toString().includes('$') || regularPrice.toString().includes('€') || regularPrice.toString().includes('£')
                  ? regularPrice
                  : `₹${regularPrice}`}
              </span>
            )}
          </div>

          {/* Live Stock Status from WooCommerce */}
          <div>
            <StockBadge
              stockStatus={currentStockStatus || stockStatus}
              stockQuantity={currentStockQuantity}
              variant="default"
              showIcon={true}
              lowStockThreshold={5}
            />
          </div>
          
          {/* Short Description */}
          {shortDescription && (
            <div 
              className="prose prose-sm text-[#5c5c52]"
              dangerouslySetInnerHTML={{ __html: shortDescription }}
            />
          )}
          
          {/* Size Selection */}
          {sizeInfo?.hasSizes && (
            <div className="space-y-4">
              <SizeSelector
                sizes={sizeInfo.availableSizes}
                selectedSize={selectedSize}
                onSizeChange={handleSizeChange}
                variant="full"
                showAvailability={true}
                showPricing={true}
                aria-label="Select size"
              />
              
              {/* Size Error */}
              {sizeError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{sizeError}</span>
                </div>
              )}
            </div>
          )}

          {/* Other Attributes (non-size) */}
          {isVariableProduct && attributes?.nodes && (
            <div className="space-y-4">
              {attributes.nodes
                .filter((attribute: any) => !['Size', 'size', 'pa_size'].includes(attribute.name))
                .map((attribute: any) => (
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
                className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
              <button
                onClick={incrementQuantity}
                disabled={availableStock !== undefined && quantity >= availableStock}
                className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
                title={availableStock !== undefined && quantity >= availableStock ? `Maximum ${availableStock} available` : ''}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {availableStock !== undefined && availableStock <= 10 && (
              <span className="text-xs text-orange-600">
                Only {availableStock} available
              </span>
            )}
          </div>
          
          {/* Stock Status */}
          <div className="bg-[#f8f8f5] border border-[#e5e2d9] p-4 rounded-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium text-[#2c2c27]">Availability:</span>
              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <span className="text-red-600 text-sm font-medium">✗ Out of Stock</span>
                ) : isLowStock ? (
                  <span className="text-orange-600 text-sm font-medium">⚠️ Only {stockQuantity} left</span>
                ) : (currentStockStatus || stockStatus) === 'ON_BACKORDER' ? (
                  <span className="text-orange-600 text-sm font-medium">⏳ On Backorder</span>
                ) : (
                  <span className="text-green-600 text-sm font-medium">✓ In Stock</span>
                )}
              </div>
            </div>
            
            {/* Additional stock information for debugging/admin - only show when stock <= 5 */}
            {stockQuantity !== undefined && stockQuantity !== null && !isLowStock && !isOutOfStock && stockQuantity <= 5 && (
              <div className="text-xs text-[#8a8778] mt-2">
                {stockQuantity} items available
              </div>
            )}
            
            {/* Real-time update indicator */}
            {stockData.lastUpdated && (
              <div className="text-xs text-[#8a8778] mt-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Stock updated: {new Date(stockData.lastUpdated).toLocaleTimeString()}
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
              className={`w-full py-6 flex items-center justify-center gap-2 transition-all duration-200 ${
                isOutOfStock 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : isAddingToCart
                    ? 'bg-[#8a8778] text-white'
                    : 'bg-[#2c2c27] text-white hover:bg-[#3c3c37] hover:shadow-md transform hover:-translate-y-0.5'
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              {isOutOfStock 
                ? 'Out of Stock' 
                : isAddingToCart 
                  ? 'Adding...' 
                  : 'Add to Cart'
              }
            </Button>
            
            {/* Validation messages */}
            {!canAddToCart && !isOutOfStock && (
              <div className="mt-2 space-y-1">
                {sizeInfo?.hasSizes && !selectedSize && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please select a size to add this product to your cart</span>
                  </div>
                )}
                {isVariableProduct && !selectedVariant && !sizeInfo?.hasSizes && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please select all options to add this product to your cart</span>
                  </div>
                )}
              </div>
            )}

            {/* Size guide or additional info */}
            {sizeInfo?.hasSizes && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Size Guide</p>
                    <p>Need help choosing the right size? Check our size guide for detailed measurements.</p>
                  </div>
                </div>
              </div>
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