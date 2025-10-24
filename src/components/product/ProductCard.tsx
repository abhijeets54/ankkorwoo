import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Loader2, Eye } from 'lucide-react';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useWishlistStore } from '@/lib/store';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { useCart } from '@/components/cart/CartProvider';
import ImageLoader from '@/components/ui/ImageLoader';
import { DEFAULT_CURRENCY_SYMBOL, DEFAULT_CURRENCY_CODE } from '@/lib/currency';
import { toast } from 'react-hot-toast';
import { useSimpleStockUpdates } from '@/hooks/useSimpleStockUpdates';
import SizeSelector from './SizeSelector';
import { SizeAttributeProcessor, ProductSizeInfo } from '@/lib/sizeAttributeProcessor';
import { WooProduct } from '@/lib/woocommerce';
import StockBadge from './StockBadge';

// Helper function to clean price for storage
const cleanPriceForStorage = (price: string | number): string => {
  if (typeof price === 'number') return price.toString();
  if (!price) return '0';

  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleanPrice = price.toString().replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleanPrice);
  return isNaN(parsed) ? '0' : parsed.toString();
};

interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  image: string;
  slug: string;
  material?: string;
  isNew?: boolean;
  stockStatus?: string;
  stockQuantity?: number;
  compareAtPrice?: string | null;
  regularPrice?: string | null;
  salePrice?: string | null;
  onSale?: boolean;
  currencySymbol?: string;
  currencyCode?: string;
  shortDescription?: string;
  type?: string;
  // Size-related props
  product?: WooProduct; // Full product data for size processing
  showSizeSelector?: boolean;
  defaultSize?: string;
  onSizeChange?: (size: string) => void;
  // Quick View prop
  onQuickView?: () => void;
}

const ProductCard = ({
  id,
  name,
  price,
  image,
  slug,
  material,
  isNew = false,
  stockStatus = 'IN_STOCK',
  stockQuantity,
  compareAtPrice = null,
  regularPrice = null,
  salePrice = null,
  onSale = false,
  currencySymbol = DEFAULT_CURRENCY_SYMBOL,
  currencyCode = DEFAULT_CURRENCY_CODE,
  shortDescription,
  type,
  product,
  showSizeSelector = true,
  defaultSize,
  onSizeChange,
  onQuickView
}: ProductCardProps) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize || '');
  const [sizeInfo, setSizeInfo] = useState<ProductSizeInfo | null>(null);
  const [currentPrice, setCurrentPrice] = useState(price);
  const [sizeError, setSizeError] = useState<string>('');
  
  const cart = useLocalCartStore();
  const { openCart } = useCart();
  const { addToWishlist, isInWishlist, removeFromWishlist } = useWishlistStore();
  const { isAuthenticated } = useCustomer();

  const inWishlist = isInWishlist(id);
  
  // Use real-time stock updates
  const realtimeStockData = useSimpleStockUpdates(id, {
    stockStatus: stockStatus,
    stockQuantity: stockQuantity,
    availableForSale: stockStatus === 'IN_STOCK'
  });

  // Process size information when product data is available
  useEffect(() => {
    if (product && showSizeSelector) {
      console.log('ProductCard: Processing product for sizes:', product.name);
      console.log('ProductCard: Product data:', {
        type: product.type,
        hasAttributes: !!product.attributes,
        attributesCount: product.attributes?.nodes?.length || 0,
        attributes: product.attributes?.nodes?.map((a: any) => a.name),
        hasVariations: !!product.variations,
        variationsCount: product.variations?.nodes?.length || 0
      });
      const extractedSizeInfo = SizeAttributeProcessor.extractSizeAttributes(product);
      console.log('ProductCard: Extracted size info:', extractedSizeInfo);
      setSizeInfo(extractedSizeInfo);
      
      // Set default size if not already set
      if (!selectedSize && extractedSizeInfo.defaultSize) {
        setSelectedSize(extractedSizeInfo.defaultSize);
        onSizeChange?.(extractedSizeInfo.defaultSize);
      }
    } else if (showSizeSelector && !product) {
      // For testing: create mock size info when no product data
      console.log('ProductCard: No product data, creating mock sizes for testing');
      const mockSizeInfo = {
        productId: id,
        availableSizes: [
          { name: 'Size', value: 'S', slug: 's', isAvailable: true, stockQuantity: 10 },
          { name: 'Size', value: 'M', slug: 'm', isAvailable: true, stockQuantity: 5 },
          { name: 'Size', value: 'L', slug: 'l', isAvailable: true, stockQuantity: 2 },
          { name: 'Size', value: 'XL', slug: 'xl', isAvailable: false, stockQuantity: 0 }
        ],
        defaultSize: 'S',
        hasSizes: true
      };
      setSizeInfo(mockSizeInfo);
      if (!selectedSize) {
        setSelectedSize('S');
        onSizeChange?.('S');
      }
    }
  }, [product, showSizeSelector, selectedSize, onSizeChange, id]);

  // Update price when size changes
  useEffect(() => {
    if (product && selectedSize && sizeInfo?.hasSizes) {
      const sizePricing = SizeAttributeProcessor.getSizePricing(product, selectedSize);
      if (sizePricing) {
        setCurrentPrice(sizePricing.price);
      }
    }
  }, [product, selectedSize, sizeInfo]);
  
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate product ID before adding to cart
    if (!id || id === '') {
      console.error('Cannot add to cart: Missing product ID for product', name);
      toast.error('Cannot add to cart: Invalid product');
      return;
    }

    // Validate size selection for variable products
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

    if (isAddingToCart) return; // Prevent multiple clicks

    setIsAddingToCart(true);
    setSizeError(''); // Clear any previous errors
    console.log(`Adding product to cart: ${name} (ID: ${id})${selectedSize ? ` - Size: ${selectedSize}` : ''}`);

    try {
      // Find variation ID if size is selected
      let variationId: string | undefined;
      let variationDatabaseId: string | undefined;
      if (product && selectedSize && sizeInfo?.hasSizes) {
        const variation = SizeAttributeProcessor.findVariationBySize(
          product.variations?.nodes || [],
          selectedSize
        );
        variationId = variation?.id;
        variationDatabaseId = variation?.databaseId?.toString();
      }

      // Real-time stock validation before adding to cart
      const { validateStockBeforeAddToCart } = await import('@/lib/woocommerce');

      const stockValidation = await validateStockBeforeAddToCart({
        productId: id,
        variationId: variationDatabaseId,
        requestedQuantity: 1
      });

      if (!stockValidation.isValid) {
        toast.error(stockValidation.message || 'This product is out of stock');
        setIsAddingToCart(false);
        return;
      }

      await cart.addToCart({
        productId: id,
        quantity: 1,
        name: name,
        price: currentPrice,
        image: {
          url: image,
          altText: name
        },
        // Add size information to cart item
        attributes: selectedSize ? [{
          name: 'Size',
          value: selectedSize
        }] : undefined,
        variationId
      });

      // Show success message and open cart
      const sizeText = selectedSize ? ` (Size: ${selectedSize})` : '';
      toast.success(`${name}${sizeText} added to cart!`);
      openCart();
    } catch (error) {
      console.error(`Failed to add ${name} to cart:`, error);
      toast.error('Failed to add item to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setSizeError(''); // Clear any size errors
    onSizeChange?.(size);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inWishlist) {
      removeFromWishlist(id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        id,
        name,
        price: cleanPriceForStorage(currentPrice), // Use current price (may be size-specific)
        image,
        handle: slug,
        material: material || 'Material not specified',
        variantId: id // Using product ID as variant ID for WooCommerce
      });

      // Show appropriate success message based on authentication status
      if (isAuthenticated) {
        toast.success('Added to your wishlist');
      } else {
        toast.success('Added to wishlist (saved locally)');
      }
    }
  };

  // Calculate discount percentage if compareAtPrice exists
  const discountPercentage = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price) 
    ? Math.round(((parseFloat(compareAtPrice) - parseFloat(price)) / parseFloat(compareAtPrice)) * 100) 
    : null;
  
  // Enhanced stock management with real-time updates
  const currentStockStatus = realtimeStockData?.stockStatus || stockStatus;
  const currentStockQuantity = realtimeStockData?.stockQuantity ?? stockQuantity;
  const isOutOfStock = currentStockStatus === 'OUT_OF_STOCK' || currentStockQuantity === 0;
  const isLowStock = currentStockQuantity !== undefined && currentStockQuantity > 0 && currentStockQuantity <= 5;
  
  return (
    <motion.div 
      className="group relative"
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/product/${slug}`} className="block">
        <div className="relative overflow-hidden mb-4">
          {/* Product Image */}
          <div className="aspect-[3/4] relative bg-[#f4f3f0] overflow-hidden">
            <ImageLoader
              src={image}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              animate={true}
              className="h-full"
            />
          </div>

          {/* Quick Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.button
              onClick={handleWishlist}
              className={`p-2 rounded-none ${inWishlist ? 'bg-[#2c2c27]' : 'bg-[#f8f8f5]'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-5 w-5 ${inWishlist ? 'text-[#f4f3f0] fill-current' : 'text-[#2c2c27]'}`} />
            </motion.button>

            <motion.button
              onClick={handleAddToCart}
              className={`p-2 rounded-none transition-all duration-300 ${
                isOutOfStock 
                  ? 'bg-[#d5d0c3] cursor-not-allowed text-[#8a8778]' 
                  : isAddingToCart 
                    ? 'bg-[#8a8778] text-[#f4f3f0] cursor-wait' 
                    : 'bg-[#2c2c27] text-[#f4f3f0] hover:bg-[#1a1a17]'
              }`}
              whileHover={isOutOfStock || isAddingToCart ? {} : { scale: 1.05 }}
              whileTap={isOutOfStock || isAddingToCart ? {} : { scale: 0.95 }}
              animate={isAddingToCart ? { scale: [1, 1.02, 1] } : {}}
              transition={isAddingToCart ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}}
              aria-label={isOutOfStock ? "Out of stock" : isAddingToCart ? "Adding to cart..." : "Add to cart"}
              disabled={isOutOfStock || isAddingToCart}
            >
              {isAddingToCart ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-5 w-5" />
                </motion.div>
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}
            </motion.button>
          </div>

          {/* New Badge */}
          {isNew && (
            <div className="absolute top-0 left-0 bg-[#2c2c27] text-[#f4f3f0] py-1 px-3 text-xs uppercase tracking-wider">
              New
            </div>
          )}

          {/* Out of Stock Badge */}
          {isOutOfStock && (
            <div className="absolute top-0 right-0 bg-red-600 text-[#f4f3f0] py-1 px-3 text-xs uppercase tracking-wider">
              Out of Stock
            </div>
          )}

          {/* Discount Badge */}
          {!isOutOfStock && discountPercentage && (
            <div className="absolute top-0 right-0 bg-[#8a8778] text-[#f4f3f0] py-1 px-3 text-xs uppercase tracking-wider">
              {discountPercentage}% Off
            </div>
          )}
        </div>
        
        {/* Product Info */}
        <div className="space-y-2">
          <h3 className="font-serif text-lg text-[#2c2c27] mb-1 line-clamp-2">{name}</h3>

          {material && (
            <p className="text-[#8a8778] text-xs">{material}</p>
          )}

          {/* Product Type */}
          {type && (
            <p className="text-[#8a8778] text-xs capitalize">{type.toLowerCase().replace('_', ' ')}</p>
          )}

          {/* Short Description */}
          {shortDescription && (
            <p className="text-[#5c5c52] text-xs line-clamp-2"
               dangerouslySetInnerHTML={{ __html: shortDescription.replace(/<[^>]*>/g, '') }} />
          )}

          {/* Price Section */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 product-card-price">
              {/* Sale Price or Regular Price */}
              <p className="text-[#2c2c27] font-medium">
                {onSale && salePrice ? (
                  salePrice.toString().includes('₹') || salePrice.toString().includes('$') || salePrice.toString().includes('€') || salePrice.toString().includes('£')
                    ? salePrice
                    : `${currencySymbol}${salePrice}`
                ) : (
                  currentPrice.toString().includes('₹') || currentPrice.toString().includes('$') || currentPrice.toString().includes('€') || currentPrice.toString().includes('£')
                    ? currentPrice
                    : `${currencySymbol}${currentPrice}`
                )}
              </p>

              {/* Regular Price (crossed out when on sale) */}
              {onSale && regularPrice && (
                <p className="text-[#8a8778] text-xs line-through product-card-compare-price">
                  {regularPrice.toString().includes('₹') || regularPrice.toString().includes('$') || regularPrice.toString().includes('€') || regularPrice.toString().includes('£')
                    ? regularPrice
                    : `${currencySymbol}${regularPrice}`}
                </p>
              )}

              {/* Compare At Price (fallback) */}
              {!onSale && compareAtPrice && parseFloat(compareAtPrice.toString().replace(/[₹$€£]/g, '')) > parseFloat(price.toString().replace(/[₹$€£]/g, '')) && (
                <p className="text-[#8a8778] text-xs line-through product-card-compare-price">
                  {compareAtPrice.toString().includes('₹') || compareAtPrice.toString().includes('$') || compareAtPrice.toString().includes('€') || compareAtPrice.toString().includes('£')
                    ? compareAtPrice
                    : `${currencySymbol}${compareAtPrice}`}
                </p>
              )}
            </div>

            {/* Stock Status & Sale Badge */}
            <div className="flex items-center justify-between gap-2">
              {/* Live Stock Status from WooCommerce */}
              <StockBadge
                stockStatus={currentStockStatus || stockStatus}
                stockQuantity={currentStockQuantity}
                variant="compact"
                showIcon={true}
                lowStockThreshold={5}
              />

              {/* Sale Badge */}
              {onSale && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                  Sale
                </span>
              )}
            </div>
          </div>

        </div>
      </Link>

      {/* Action Buttons - Strip Style */}
      <div className="mt-4 space-y-2">
        {/* Quick View Strip Button */}
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView?.();
          }}
          className="w-full py-3 px-4 bg-[#2c2c27] text-[#f4f3f0] hover:bg-[#1a1a17] hover:shadow-lg transition-all duration-300"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
          aria-label="Quick view product"
        >
          <div className="flex items-center justify-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Quick View</span>
          </div>
        </motion.button>

        {/* Add to Wishlist Strip Button */}
        <motion.button
          onClick={handleWishlist}
          className={`w-full py-3 px-4 border transition-all duration-200 ${
            inWishlist
              ? 'bg-[#2c2c27] text-[#f4f3f0] border-[#2c2c27]'
              : 'bg-transparent text-[#2c2c27] border-[#2c2c27] hover:bg-[#2c2c27] hover:text-[#f4f3f0]'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <div className="flex items-center justify-center gap-2">
            <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">
              {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            </span>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProductCard; 