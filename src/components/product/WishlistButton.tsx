'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWishlistStore, WishlistItem } from '@/lib/wishlistStore';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

interface WishlistButtonProps {
  product: {
    id: string;
    productId: string;
    name: string;
    price: string;
    image: string;
    slug: string;
  };
  variant?: 'icon' | 'button';
  className?: string;
}

const WishlistButton: React.FC<WishlistButtonProps> = ({
  product,
  variant = 'icon',
  className = '',
}) => {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlistStore();
  const { isAuthenticated } = useCustomer();

  const isInList = isInWishlist(product.id);

  const handleToggleWishlist = () => {
    if (isInList) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      const wishlistItem: WishlistItem = {
        id: product.id,
        productId: product.productId,
        name: product.name,
        price: product.price,
        image: product.image,
        slug: product.slug,
      };
      addToWishlist(wishlistItem);

      // Show appropriate success message based on authentication status
      if (isAuthenticated) {
        toast.success('Added to your wishlist');
      } else {
        toast.success('Added to wishlist (saved locally)');
      }
    }
  };
  
  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleWishlist}
        className={`group p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
        aria-label={isInList ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <motion.div
          initial={{ scale: 1 }}
          whileTap={{ scale: 0.8 }}
        >
          <Heart
            className={`h-5 w-5 ${
              isInList
                ? 'fill-red-500 text-red-500'
                : 'fill-transparent text-gray-600 group-hover:text-gray-900'
            }`}
          />
        </motion.div>
      </button>
    );
  }
  
  return (
    <Button
      variant={isInList ? 'outline' : 'default'}
      onClick={handleToggleWishlist}
      className={`flex items-center gap-2 ${className}`}
    >
      <Heart
        className={`h-4 w-4 ${
          isInList ? 'fill-red-500 text-red-500' : 'fill-transparent'
        }`}
      />
      {isInList ? 'Remove from Wishlist' : 'Add to Wishlist'}
    </Button>
  );
};

export default WishlistButton; 