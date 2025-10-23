'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { X, Minus, Plus, ShoppingBag, Heart, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { WooProduct } from '@/lib/woocommerce';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useCart } from '@/components/cart/CartProvider';
import { useWishlistStore } from '@/lib/store';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { SizeAttributeProcessor, ProductSizeInfo } from '@/lib/sizeAttributeProcessor';
import SizeSelector from './SizeSelector';
import StockBadge from './StockBadge';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useSimpleStockUpdates } from '@/hooks/useSimpleStockUpdates';

// Helper function to clean price for storage
const cleanPriceForStorage = (price: string | number): string => {
  if (typeof price === 'number') return price.toString();
  if (!price) return '0';

  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleanPrice = price.toString().replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleanPrice);
  return isNaN(parsed) ? '0' : parsed.toString();
};

interface QuickViewModalProps {
  product: WooProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [sizeInfo, setSizeInfo] = useState<ProductSizeInfo | null>(null);
  const [sizeError, setSizeError] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const cartStore = useLocalCartStore();
  const { openCart } = useCart();
  const { addToWishlist, isInWishlist, removeFromWishlist } = useWishlistStore();
  const { isAuthenticated } = useCustomer();

  // Extract product data with safe defaults
  const {
    databaseId,
    name,
    slug,
    price,
    regularPrice,
    salePrice,
    onSale,
    description,
    shortDescription,
    image,
    galleryImages,
    stockStatus,
    stockQuantity,
    type,
    variations,
    attributes
  } = product || {};

  // Format product images for display - same as ProductDetail
  const productImages = [
    image?.sourceUrl ? { sourceUrl: image.sourceUrl, altText: image.altText || name } : null,
    ...(galleryImages?.nodes || [])
  ].filter(Boolean);

  const isVariableProduct = type === 'VARIABLE';
  const productId = databaseId?.toString() || '';

  // Get real-time stock updates - always call the hook with safe defaults
  const stockData = useSimpleStockUpdates(productId, {
    stockStatus: stockStatus || 'IN_STOCK',
    stockQuantity: stockQuantity,
    availableForSale: stockStatus === 'IN_STOCK'
  });

  const currentStockStatus = stockData.stockStatus || stockStatus;
  const currentStockQuantity = stockData.stockQuantity ?? stockQuantity;

  // Extract size information
  useEffect(() => {
    if (product) {
      const extractedSizeInfo = SizeAttributeProcessor.extractSizeAttributes(product);
      setSizeInfo(extractedSizeInfo);

      // Set default size if available
      if (extractedSizeInfo.hasSizes && extractedSizeInfo.defaultSize && !selectedSize) {
        setSelectedSize(extractedSizeInfo.defaultSize);
      }
    }
  }, [product, selectedSize]);

  // Reset state when modal opens with new product
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImage(0);
      setQuantity(1);
      setSizeError('');
      setSelectedSize('');
    }
  }, [isOpen, product]);

  // Early return AFTER all hooks have been called
  if (!product) return null;

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setSizeError('');
  };

  const handleAddToCart = async () => {
    // Validate size selection
    if (sizeInfo?.hasSizes && !selectedSize) {
      setSizeError('Please select a size');
      toast.error('Please select a size');
      return;
    }

    // Validate size availability
    if (sizeInfo?.hasSizes && selectedSize) {
      const validation = SizeAttributeProcessor.validateSizeSelection(product, selectedSize);
      if (!validation.isValid || !validation.isAvailable) {
        setSizeError(validation.error || 'Selected size is not available');
        toast.error(validation.error || 'Selected size is not available');
        return;
      }
    }

    setIsAddingToCart(true);

    try {
      // Find variation ID if size is selected
      let variationId: string | undefined;
      if (isVariableProduct && selectedSize && sizeInfo?.hasSizes) {
        const variation = SizeAttributeProcessor.findVariationBySize(
          variations?.nodes || [],
          selectedSize
        );
        variationId = variation?.id;
      }

      await cartStore.addToCart({
        productId: productId,
        quantity,
        name,
        price: salePrice || price || '0',
        image: {
          url: productImages[0]?.sourceUrl || '',
          altText: productImages[0]?.altText || name
        },
        attributes: selectedSize ? [{
          name: 'Size',
          value: selectedSize
        }] : undefined,
        variationId
      });

      const sizeText = selectedSize ? ` (Size: ${selectedSize.toUpperCase()})` : '';
      toast.success(`${name}${sizeText} added to cart!`);

      openCart();
      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlistToggle = () => {
    if (isInWishlist(productId)) {
      removeFromWishlist(productId);
      toast.success('Removed from wishlist');
    } else {
      const imageUrl = productImages[0]?.sourceUrl || image?.sourceUrl || '';
      const displayPrice = salePrice || price || '0';

      addToWishlist({
        id: productId,
        name: name || '',
        price: cleanPriceForStorage(displayPrice),
        image: imageUrl,
        handle: slug || '',
        material: 'Premium Fabric',
        variantId: productId
      });

      // Show appropriate success message based on authentication status
      if (isAuthenticated) {
        toast.success('Added to your wishlist');
      } else {
        toast.success('Added to wishlist (saved locally)');
      }
    }
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
  };

  const handleNextImage = () => {
    setSelectedImage((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
  };

  const inWishlist = isInWishlist(productId);
  const displayPrice = salePrice || price;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-lg shadow-2xl z-[10001] overflow-hidden flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close quick view"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8 lg:p-12">
                {/* Left: Images */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    {productImages.length > 0 && (
                      <Image
                        src={productImages[selectedImage]?.sourceUrl || '/placeholder-product.jpg'}
                        alt={productImages[selectedImage]?.altText || name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                        priority
                      />
                    )}

                    {/* Image Navigation */}
                    {productImages.length > 1 && (
                      <>
                        <button
                          onClick={handlePrevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleNextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Gallery */}
                  {productImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {productImages.slice(0, 4).map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === index
                              ? 'border-[#2c2c27] scale-95'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Image
                            src={img.sourceUrl}
                            alt={img.altText || `${name} - ${index + 1}`}
                            fill
                            sizes="100px"
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Product Info */}
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <h2 className="text-2xl md:text-3xl font-serif text-[#2c2c27] mb-2">
                      {name}
                    </h2>

                    {/* Price */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-medium text-[#2c2c27]">
                        {displayPrice}
                      </span>
                      {onSale && regularPrice && (
                        <span className="text-lg line-through text-[#8a8778]">
                          {regularPrice}
                        </span>
                      )}
                      {onSale && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                          Sale
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Status */}
                  <StockBadge
                    stockStatus={currentStockStatus}
                    stockQuantity={currentStockQuantity}
                    variant="default"
                    showIcon={true}
                  />

                  {/* Short Description */}
                  {shortDescription && (
                    <div
                      className="prose prose-sm text-[#5c5c52] max-w-none"
                      dangerouslySetInnerHTML={{ __html: shortDescription }}
                    />
                  )}

                  {/* Size Selector */}
                  {sizeInfo?.hasSizes && sizeInfo.availableSizes?.length > 0 && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-[#2c2c27]">
                        Select Size
                      </label>
                      <SizeSelector
                        sizes={sizeInfo.availableSizes}
                        selectedSize={selectedSize}
                        onSizeChange={handleSizeChange}
                        variant="full"
                        showAvailability={true}
                        showPricing={false}
                      />
                      {sizeError && (
                        <p className="text-red-600 text-sm">{sizeError}</p>
                      )}
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[#2c2c27]">
                      Quantity
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-6 py-3 text-center min-w-[60px] font-medium">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="p-3 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleAddToCart}
                      disabled={isAddingToCart}
                      className="w-full h-12 bg-[#2c2c27] text-white hover:bg-[#3d3d35] font-medium text-base"
                    >
                      {isAddingToCart ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-5 w-5 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleWishlistToggle}
                        variant="outline"
                        className="h-12"
                      >
                        <Heart
                          className={`h-5 w-5 mr-2 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`}
                        />
                        {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                      </Button>

                      <Link href={`/product/${slug}`} onClick={onClose}>
                        <Button variant="outline" className="w-full h-12">
                          <ExternalLink className="h-5 w-5 mr-2" />
                          Full Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;
