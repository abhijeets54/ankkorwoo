import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Loader2 } from 'lucide-react';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useWishlistStore } from '@/lib/store';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { useCart } from '@/components/cart/CartProvider';
import ImageLoader from '@/components/ui/ImageLoader';
import { DEFAULT_CURRENCY_SYMBOL, DEFAULT_CURRENCY_CODE } from '@/lib/currency';
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
  type
}: ProductCardProps) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
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
  
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate product ID before adding to cart
    if (!id || id === '') {
      console.error('Cannot add to cart: Missing product ID for product', name);
      toast.error('Cannot add to cart: Invalid product');
      return;
    }

    if (isAddingToCart) return; // Prevent multiple clicks

    setIsAddingToCart(true);
    console.log(`Adding product to cart: ${name} (ID: ${id})`);

    try {
      await cart.addToCart({
        productId: id,
        quantity: 1,
        name: name,
        price: price,
        image: {
          url: image,
          altText: name
        }
      });

      // Show success message and open cart
      toast.success(`${name} added to cart!`);
      openCart();
    } catch (error) {
      console.error(`Failed to add ${name} to cart:`, error);
      toast.error('Failed to add item to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
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
        price: cleanPriceForStorage(price),
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
                  price.toString().includes('₹') || price.toString().includes('$') || price.toString().includes('€') || price.toString().includes('£')
                    ? price
                    : `${currencySymbol}${price}`
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

            {/* Stock Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <span className="text-red-600 text-xs font-medium">✗ Out of Stock</span>
                ) : isLowStock ? (
                  <span className="text-orange-600 text-xs font-medium">⚠️ Only {currentStockQuantity} left</span>
                ) : currentStockStatus === 'ON_BACKORDER' ? (
                  <span className="text-orange-600 text-xs font-medium">⏳ Backorder</span>
                ) : currentStockStatus === 'IN_STOCK' ? (
                  <span className="text-green-600 text-xs font-medium">✓ In Stock</span>
                ) : (
                  <span className="text-gray-600 text-xs font-medium">? Unknown</span>
                )}
              </div>

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
        {/* Add to Cart Strip Button */}
        <motion.button
          onClick={handleAddToCart}
          className={`w-full py-3 px-4 transition-all duration-300 ${
            isOutOfStock
              ? 'bg-[#e5e2d9] text-[#8a8778] cursor-not-allowed border border-[#d5d0c3]'
              : isAddingToCart
                ? 'bg-[#8a8778] text-[#f4f3f0] cursor-wait shadow-md'
                : 'bg-[#2c2c27] text-[#f4f3f0] hover:bg-[#1a1a17] hover:shadow-lg'
          }`}
          whileHover={isOutOfStock || isAddingToCart ? {} : { scale: 1.02, y: -1 }}
          whileTap={isOutOfStock || isAddingToCart ? {} : { scale: 0.98 }}
          animate={isAddingToCart ? { scale: [1, 1.01, 1] } : {}}
          transition={isAddingToCart ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
          aria-label={isOutOfStock ? "Out of stock" : isAddingToCart ? "Adding to cart..." : "Add to cart"}
          disabled={isOutOfStock || isAddingToCart}
        >
          <div className="flex items-center justify-center gap-2">
            {isAddingToCart ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-4 w-4" />
                </motion.div>
                <motion.div
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="text-sm font-medium">Adding to Cart...</span>
                </motion.div>
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </span>
              </>
            )}
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