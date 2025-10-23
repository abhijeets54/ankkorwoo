'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, X, ShoppingBag, Check, ArrowRight, Trash2, Minus, Plus } from 'lucide-react';
import { useWishlistStore } from '@/lib/store';
import { useLocalCartStore } from '@/lib/localCartStore';
import { useCustomer } from '@/components/providers/CustomerProvider';
import Loader from '@/components/ui/loader';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { getProductBySlug } from '@/lib/woocommerce';
import { SizeAttributeProcessor, ProductSizeInfo } from '@/lib/sizeAttributeProcessor';

// Helper function to safely parse price strings
const parsePrice = (price: string | number): number => {
  if (typeof price === 'number') return price;
  if (!price) return 0;

  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleanPrice = price.toString().replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleanPrice);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to format price for display
const formatPrice = (price: string | number): string => {
  const numericPrice = parsePrice(price);
  return numericPrice.toFixed(2);
};

// Sample wishlist data (would normally be stored in a database or localStorage)
const sampleWishlistItems = [
  {
    id: 'prod_1',
    name: 'Oxford Dress Shirt',
    price: '4999.00',
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80',
    handle: 'oxford-dress-shirt',
    material: 'Egyptian Cotton',
    variantId: 'gid://shopify/ProductVariant/1',
  },
  {
    id: 'prod_7',
    name: 'Wool Dress Pants',
    price: '5999.00',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80',
    handle: 'wool-dress-pants',
    material: 'Italian Wool',
    variantId: 'gid://shopify/ProductVariant/7',
  },
  {
    id: 'prod_13',
    name: 'Pima Cotton Polo',
    price: '3499.00',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80',
    handle: 'pima-cotton-polo',
    material: 'Pima Cotton',
    variantId: 'gid://shopify/ProductVariant/13',
  },
];

export default function WishlistPage() {
  const cart = useLocalCartStore();
  const { items: wishlistItems, removeFromWishlist, clearWishlist } = useWishlistStore();
  const { isAuthenticated, isLoading: customerLoading } = useCustomer();
  const [isLoading, setIsLoading] = useState(true);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [productData, setProductData] = useState<Record<string, any>>({});
  const [sizeInfo, setSizeInfo] = useState<Record<string, ProductSizeInfo>>({});
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  
  // Show signup prompt for guest users with items
  useEffect(() => {
    if (!isAuthenticated && wishlistItems.length > 0 && !customerLoading) {
      // Check if user has already dismissed the prompt
      const promptDismissed = typeof window !== 'undefined'
        ? sessionStorage.getItem('wishlist_prompt_dismissed') === 'true'
        : false;

      if (!promptDismissed) {
        // Only show the prompt after a delay and if user has at least one item
        const timer = setTimeout(() => {
          setShowSignupPrompt(true);
        }, 3000); // Show after 3 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, wishlistItems.length, customerLoading]);
  
  // Fetch product data for each wishlist item
  useEffect(() => {
    const fetchProductData = async () => {
      const newProductData: Record<string, any> = {};
      const newSizeInfo: Record<string, ProductSizeInfo> = {};

      for (const item of wishlistItems) {
        if (!productData[item.id] && item.handle) {
          try {
            console.log(`Fetching product data for: ${item.handle}`);
            const product = await getProductBySlug(item.handle);
            if (product) {
              newProductData[item.id] = product;

              // Extract size information
              const extractedSizeInfo = SizeAttributeProcessor.extractSizeAttributes(product);
              newSizeInfo[item.id] = extractedSizeInfo;

              console.log(`Extracted sizes for ${item.name}:`, extractedSizeInfo);
            }
          } catch (error) {
            console.error(`Error fetching product ${item.handle}:`, error);
          }
        }
      }

      if (Object.keys(newProductData).length > 0) {
        setProductData(prev => ({ ...prev, ...newProductData }));
      }
      if (Object.keys(newSizeInfo).length > 0) {
        setSizeInfo(prev => ({ ...prev, ...newSizeInfo }));
      }
    };

    if (wishlistItems.length > 0) {
      fetchProductData();
    }
  }, [wishlistItems]);

  // Initialize quantities and sizes for each item
  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    const initialSizes: Record<string, string> = {};

    wishlistItems.forEach(item => {
      if (!quantities[item.id]) {
        initialQuantities[item.id] = 1;
      }

      // Set default size from actual product data
      if (!selectedSizes[item.id] && sizeInfo[item.id]?.hasSizes) {
        const defaultSize = sizeInfo[item.id].defaultSize || sizeInfo[item.id].availableSizes[0]?.value;
        if (defaultSize) {
          initialSizes[item.id] = defaultSize;
        }
      }
    });

    if (Object.keys(initialQuantities).length > 0) {
      setQuantities(prev => ({ ...prev, ...initialQuantities }));
    }
    if (Object.keys(initialSizes).length > 0) {
      setSelectedSizes(prev => ({ ...prev, ...initialSizes }));
    }
  }, [wishlistItems, sizeInfo]);

  // Simulate loading delay
  useEffect(() => {
    if (!customerLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [customerLoading]);

  // Get available stock for an item
  const getAvailableStock = (itemId: string): number | undefined => {
    const itemSizeInfo = sizeInfo[itemId];
    const itemSize = selectedSizes[itemId];

    // For variable products with size selection
    if (itemSizeInfo?.hasSizes && itemSize) {
      const selectedSizeInfo = itemSizeInfo.availableSizes.find(s => s.value === itemSize);
      return selectedSizeInfo?.stockQuantity;
    }

    // For simple products, check if we have product data
    if (productData[itemId]?.stockQuantity !== undefined) {
      return productData[itemId].stockQuantity;
    }

    return undefined;
  };

  // Quantity handlers with stock validation
  const incrementQuantity = (itemId: string) => {
    const availableStock = getAvailableStock(itemId);
    const currentQuantity = quantities[itemId] || 1;

    if (availableStock !== undefined && currentQuantity >= availableStock) {
      toast.error(`Only ${availableStock} items available in stock`);
      return;
    }

    setQuantities(prev => ({
      ...prev,
      [itemId]: currentQuantity + 1
    }));
  };

  const decrementQuantity = (itemId: string) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] || 1) - 1)
    }));
  };

  const updateSize = (itemId: string, size: string) => {
    setSelectedSizes(prev => ({
      ...prev,
      [itemId]: size
    }));
  };



  // Add item to cart and optionally remove from wishlist
  const handleAddToCart = async (item: typeof wishlistItems[0], removeAfterAdd: boolean = false) => {
    // Validate size selection for variable products
    const itemSizeInfo = sizeInfo[item.id];
    const itemSize = selectedSizes[item.id];

    if (itemSizeInfo?.hasSizes && !itemSize) {
      toast.error('Please select a size before adding to cart');
      return;
    }

    // Validate size availability
    if (itemSizeInfo?.hasSizes && itemSize && productData[item.id]) {
      const validation = SizeAttributeProcessor.validateSizeSelection(productData[item.id], itemSize);
      if (!validation.isValid || !validation.isAvailable) {
        toast.error(validation.error || 'Selected size is not available');
        return;
      }
    }

    // Set loading state for this specific item
    setAddingToCart(prev => ({ ...prev, [item.id]: true }));

    try {
      const itemQuantity = quantities[item.id] || 1;

      // Find variation ID if size is selected
      let variationId: string | undefined = item.variantId?.replace('gid://shopify/ProductVariant/', '');

      if (productData[item.id] && itemSize && itemSizeInfo?.hasSizes) {
        const variation = SizeAttributeProcessor.findVariationBySize(
          productData[item.id].variations?.nodes || [],
          itemSize
        );
        if (variation?.databaseId) {
          variationId = variation.databaseId.toString();
        }
      }

      // Convert wishlist item to cart item format for localCartStore
      const cartItem = {
        productId: item.id,
        variationId: variationId,
        quantity: itemQuantity,
        name: item.name || 'Unnamed Product',
        price: item.price ? formatPrice(item.price) : '0.00',
        image: item.image ? {
          url: item.image,
          altText: item.name || 'Product image'
        } : undefined,
        attributes: itemSize ? [{
          name: 'Size',
          value: itemSize
        }] : undefined
      };

      await cart.addToCart(cartItem);

      // Show success message with size info
      const sizeText = itemSize ? ` (Size: ${itemSize})` : '';
      toast.success(`${item.name}${sizeText} added to cart!`);

      // Show visual feedback
      setAddedItems(prev => ({ ...prev, [item.id]: true }));

      // Reset visual feedback after 2 seconds
      setTimeout(() => {
        setAddedItems(prev => ({ ...prev, [item.id]: false }));
      }, 2000);

      if (removeAfterAdd) {
        removeFromWishlist(item.id);
      }
    } catch (error) {
      console.error('Error from cart.addToCart:', error);

      // Provide specific error message based on the error
      if (error instanceof Error) {
        if (error.message?.includes('out of stock')) {
          toast.error('This product is currently out of stock.');
        } else if (error.message?.includes('invalid')) {
          toast.error('This product has an invalid format. Please try another item.');
        } else {
          toast.error(error.message || 'Unable to add this item to your cart. Please try again later.');
        }
      } else {
        toast.error('An unexpected error occurred. Please try again later.');
      }
    } finally {
      // Clear loading state
      setAddingToCart(prev => ({ ...prev, [item.id]: false }));
    }
  };
  
  // Add all items to cart
  const addAllToCart = async () => {
    try {
      if (wishlistItems.length === 0) {
        toast.error('Your wishlist is empty');
        return;
      }

      setIsLoading(true);
      
      // Create a loading toast that we'll update with progress
      const loadingToastId = toast.loading('Adding items to your cart...');
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process items sequentially to avoid race conditions
      for (const item of wishlistItems) {
        try {
          // Convert wishlist item to cart item format for localCartStore
          const cartItem = {
            productId: item.id,
            variationId: item.variantId?.replace('gid://shopify/ProductVariant/', '') || undefined,
            quantity: 1,
            name: item.name || 'Unnamed Product',
            price: item.price ? formatPrice(item.price) : '0.00',
            image: item.image ? {
              url: item.image,
              altText: item.name || 'Product image'
            } : undefined
          };
          
          // Add item to cart one at a time
          await cart.addToCart(cartItem);
          
          // Update success count and the loading toast with progress
          successCount++;
          toast.loading(`Adding items to cart: ${successCount}/${wishlistItems.length}`, { id: loadingToastId });
          
          // Small delay between requests to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`Error adding item ${item.name || 'Unnamed Product'} to cart:`, error);
          errorCount++;
        }
      }
      
      // Dismiss the loading toast
      toast.dismiss(loadingToastId);
      setIsLoading(false);
      
      // Show appropriate success/error messages
      if (successCount > 0 && errorCount > 0) {
        toast.success(`Added ${successCount} items to your cart`);
        toast.error(`${errorCount} items could not be added`);
      } else if (successCount > 0) {
        toast.success(`All ${successCount} items added to your cart`);
      } else {
        toast.error('Unable to add items to your cart. Please try again later.');
      }
    } catch (error) {
      console.error('Error in addAllToCart:', error);
      setIsLoading(false);
      toast.dismiss();
      toast.error('An error occurred while adding items to your cart');
    }
  };
  
  const dismissSignupPrompt = () => {
    setShowSignupPrompt(false);
    // Remember this decision in session storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('wishlist_prompt_dismissed', 'true');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif">My Wishlist</h1>
        
        {wishlistItems.length > 0 && (
          <Button
            variant="outline"
            onClick={clearWishlist}
            className="text-sm"
          >
            Clear All
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader size="lg" color="#8a8778" />
        </div>
      ) : (
        <>
          {/* Guest user info banner */}
          {!isAuthenticated && wishlistItems.length > 0 && !showSignupPrompt && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <Heart className="h-4 w-4 text-blue-600 mr-2" />
                <p className="text-sm text-blue-800">
                  Your wishlist is saved locally on this device.
                  <Link href="/sign-up" className="ml-1 font-medium underline hover:no-underline">
                    Create an account
                  </Link> to access it from anywhere.
                </p>
              </div>
            </div>
          )}

          {/* Sign up prompt for guest users with items */}
          {!isAuthenticated && showSignupPrompt && wishlistItems.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 border border-[#e5e2d9] bg-[#f8f8f5] rounded-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <Heart className="h-5 w-5 text-[#8a8778] mt-1 mr-3" />
                  <div>
                    <h3 className="font-serif font-medium text-[#2c2c27]">Sync your wishlist across devices</h3>
                    <p className="text-sm text-[#5c5c52] mt-1">Your wishlist works without an account and is saved locally. Sign in to sync it across all your devices.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href="/sign-up" className="text-sm text-[#2c2c27] font-medium hover:text-[#8a8778] transition-colors">
                    Sign Up
                  </Link>
                  <button 
                    onClick={dismissSignupPrompt}
                    className="text-[#8a8778] hover:text-[#2c2c27] transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        
          {wishlistItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex justify-center items-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Heart className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-medium mb-2">Your wishlist is empty</h2>
              <p className="text-gray-500 mb-2">
                Add items you love to your wishlist. Review them anytime and easily move them to the cart.
              </p>
              {!isAuthenticated && (
                <p className="text-sm text-gray-400 mb-6">
                  No account needed - your wishlist is saved locally on this device.
                </p>
              )}
              <Link href="/categories">
                <Button>
                  Continue Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistItems.map((item) => (
                  <div key={item.id} className="border rounded-md overflow-hidden">
                    <div className="relative">
                      <Link href={`/product/${item.handle || '#'}`}>
                        <div className="aspect-square relative bg-gray-100">
                          <Image
                            src={item.image || '/placeholder-image.jpg'}
                            alt={item.name || 'Product image'}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                      </Link>
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <Link href={`/product/${item.handle || '#'}`}>
                        <h2 className="font-medium text-lg hover:underline">{item.name || 'Unnamed Product'}</h2>
                      </Link>
                      <p className="text-gray-700">₹{item.price ? formatPrice(item.price) : '0.00'}</p>

                      {/* Size Selector - Only show if product has sizes */}
                      {sizeInfo[item.id]?.hasSizes && sizeInfo[item.id].availableSizes?.length > 0 ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                          <div className="flex gap-2 flex-wrap">
                            {sizeInfo[item.id].availableSizes.map((sizeOption) => {
                              const isAvailable = sizeOption.isAvailable;
                              const isSelected = selectedSizes[item.id] === sizeOption.value;

                              return (
                                <button
                                  key={sizeOption.value}
                                  onClick={() => isAvailable && updateSize(item.id, sizeOption.value)}
                                  disabled={!isAvailable}
                                  className={`px-3 py-1 border rounded text-sm font-medium transition-colors ${
                                    isSelected
                                      ? 'bg-[#2c2c27] text-white border-[#2c2c27]'
                                      : isAvailable
                                      ? 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                  }`}
                                  title={isAvailable ? `Select size ${sizeOption.value}` : `Size ${sizeOption.value} is out of stock`}
                                >
                                  {sizeOption.value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        !sizeInfo[item.id] ? (
                          <div className="text-sm text-gray-500">Loading sizes...</div>
                        ) : null
                      )}

                      {/* Quantity Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <div className="space-y-2">
                          <div className="flex items-center border border-gray-300 rounded w-fit">
                            <button
                              onClick={() => decrementQuantity(item.id)}
                              className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={quantities[item.id] <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-2 font-medium">{quantities[item.id] || 1}</span>
                            <button
                              onClick={() => incrementQuantity(item.id)}
                              className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={getAvailableStock(item.id) !== undefined && (quantities[item.id] || 1) >= getAvailableStock(item.id)!}
                              title={getAvailableStock(item.id) !== undefined && (quantities[item.id] || 1) >= getAvailableStock(item.id)! ? `Maximum ${getAvailableStock(item.id)} available` : ''}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {getAvailableStock(item.id) !== undefined && getAvailableStock(item.id)! <= 10 && (
                            <span className="text-xs text-orange-600">
                              Only {getAvailableStock(item.id)} available
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleAddToCart(item)}
                        className="w-full flex items-center justify-center gap-2"
                        disabled={(sizeInfo[item.id]?.hasSizes && !selectedSizes[item.id]) || addingToCart[item.id]}
                      >
                        {addingToCart[item.id] ? (
                          <>
                            <Loader size="sm" color="currentColor" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-4 w-4" />
                            {sizeInfo[item.id]?.hasSizes && !selectedSizes[item.id] ? 'Select Size' : 'Add to Cart'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 text-center">
                <Link href="/categories">
                  <Button variant="outline">Continue Shopping</Button>
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="border-b border-[#e5e2d9]">
                    <tr>
                      <th className="py-4 text-left font-serif text-[#2c2c27]">Product</th>
                      <th className="py-4 text-left font-serif text-[#2c2c27]">Price</th>
                      <th className="py-4 text-center font-serif text-[#2c2c27]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e2d9]">
                    {wishlistItems.map((item) => (
                      <tr key={item.id} className="group">
                        <td className="py-6">
                          <div className="flex items-center">
                            <div className="relative mr-4 h-24 w-20 overflow-hidden bg-[#f4f3f0]">
                              <Link href={`/product/${item.handle || '#'}`}>
                                <Image
                                  src={item.image || '/placeholder-image.jpg'}
                                  alt={item.name || 'Product image'}
                                  fill
                                  sizes="(max-width: 768px) 80px, 120px"
                                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                />
                              </Link>
                            </div>
                            <div>
                              <Link
                                href={`/product/${item.handle || '#'}`}
                                className="font-serif text-lg text-[#2c2c27] hover:text-[#8a8778] transition-colors"
                              >
                                {item.name || 'Unnamed Product'}
                              </Link>
                              <p className="text-sm text-[#8a8778]">{item.material || 'Material not specified'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 font-medium text-[#2c2c27]">
                          ₹{item.price ? formatPrice(item.price) : '0.00'}
                        </td>
                        <td className="py-6">
                          <div className="flex items-center justify-center space-x-4">
                            <motion.button
                              onClick={() => handleAddToCart(item)}
                              className={`${addedItems[item.id] ? 'bg-[#2c2c27] text-[#f4f3f0]' : 'text-[#2c2c27]'} p-2 rounded-full transition-colors hover:text-[#8a8778]`}
                              aria-label="Add to cart"
                              whileTap={{ scale: 0.95 }}
                              disabled={addingToCart[item.id]}
                            >
                              {addingToCart[item.id] ? (
                                <Loader size="sm" color="currentColor" />
                              ) : addedItems[item.id] ? (
                                <Check className="h-5 w-5" />
                              ) : (
                                <ShoppingBag className="h-5 w-5" />
                              )}
                            </motion.button>
                            <motion.button
                              onClick={() => removeFromWishlist(item.id)}
                              className="text-[#2c2c27] p-2 rounded-full hover:text-[#8a8778] transition-colors"
                              aria-label="Remove from wishlist"
                              whileTap={{ scale: 0.95 }}
                            >
                              <X className="h-5 w-5" />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#F8F8F5',
            color: '#2C2C27',
            border: '1px solid #E5E2D9',
          },
          success: {
            iconTheme: {
              primary: '#2C2C27',
              secondary: '#F8F8F5',
            },
          },
          error: {
            iconTheme: {
              primary: '#2C2C27',
              secondary: '#F8F8F5',
            },
          }
        }}
      />
    </div>
  );
} 