'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, ArrowRight, CreditCard, AlertTriangle, RefreshCw, WifiOff, Trash2 } from 'lucide-react';
import { useLocalCartStore } from '@/lib/localCartStore';
import type { CartItem } from '@/lib/localCartStore';
import * as woocommerce from '@/lib/woocommerce';
import { validateProductId } from '@/lib/wooInventoryMapping';
import Loader from '@/components/ui/loader';
// Import removed as it's not being used
import { DEFAULT_CURRENCY_SYMBOL } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import AnimatedCheckoutButton from '@/components/cart/AnimatedCheckoutButton';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/components/cart/CartProvider';
import { cartEvents, notificationEvents } from '@/lib/eventBus';

// Extended cart item with handle for navigation
interface ExtendedCartItem extends CartItem {
  productHandle?: string;
}

// Cart component - now uses useCart hook instead of props
const Cart: React.FC = () => {
  // Get cart UI state from context
  const { isOpen, toggleCart } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [quantityUpdateInProgress, setQuantityUpdateInProgress] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [productHandles, setProductHandles] = useState<Record<string, string>>({});
  const router = useRouter();

  // Get authentication state
  const { isAuthenticated, user, token, isLoading: authLoading } = useAuth();


  // Get cart data from the store
  const cart = useLocalCartStore();
  const {
    items,
    itemCount,
    removeCartItem: removeItem,
    updateCartItem: updateItem,
    clearCart,
    error: initializationError,
    setError
  } = cart;

  // Toast functionality now handled via events
  
  // Function to safely format price
  const safeFormatPrice = (price: string | number): string => {
    try {
      const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
      if (isNaN(numericPrice)) return '0.00';
      return numericPrice.toFixed(2);
    } catch (error) {
      console.error('Error formatting price:', error);
      return '0.00';
    }
  };
  
  // Debug cart items
  useEffect(() => {
    console.log('Cart items:', items);
    console.log('Cart subtotal calculation:');
    let manualSubtotal = 0;
    items.forEach(item => {
      let itemPrice = 0;
      if (typeof item.price === 'string') {
        // Remove currency symbol if present
        const priceString = item.price.replace(/[₹$€£]/g, '').trim();
        // Replace comma with empty string if present (for Indian number format)
        const cleanPrice = priceString.replace(/,/g, '');
        itemPrice = parseFloat(cleanPrice);
      } else {
        itemPrice = item.price;
      }
      const itemTotal = itemPrice * item.quantity;
      console.log(`Item: ${item.name}, Price: ${item.price}, Cleaned price: ${itemPrice}, Quantity: ${item.quantity}, Total: ${itemTotal}`);
      manualSubtotal += itemTotal;
    });
    console.log(`Manual subtotal calculation: ${manualSubtotal}`);
    console.log(`Store subtotal calculation: ${cart.subtotal()}`);
  }, [items, cart]);
  
  // Calculate subtotal manually to ensure accuracy
  const calculateSubtotal = (): number => {
    return items.reduce((total, item) => {
      let itemPrice = 0;
      if (typeof item.price === 'string') {
        // Remove currency symbol if present
        const priceString = item.price.replace(/[₹$€£]/g, '').trim();
        // Replace comma with empty string if present (for Indian number format)
        const cleanPrice = priceString.replace(/,/g, '');
        itemPrice = parseFloat(cleanPrice);
      } else {
        itemPrice = item.price;
      }
      
      if (isNaN(itemPrice)) {
        console.warn(`Invalid price for item ${item.id}: ${item.price}`);
        return total;
      }
      
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  // Get calculated values
  const manualSubtotal = calculateSubtotal();
  const subtotalFormatted = safeFormatPrice(manualSubtotal);
  const totalFormatted = subtotalFormatted; // Total is same as subtotal for now
  
  const currencySymbol = '₹';
  
  // Load product handles for navigation when items change
  useEffect(() => {
    const loadProductHandles = async () => {
      const newHandles: Record<string, string> = {};
      const invalidProductIds: string[] = [];
      
      for (const item of items) {
        try {
          if (!productHandles[item.productId]) {
            // Fetch product details to get the handle
            try {
              const product = await woocommerce.getProductById(item.productId);
              if (product?.slug) {
                newHandles[item.productId] = product.slug;
              } else {
                console.warn(`Product with ID ${item.productId} has no slug`);
                newHandles[item.productId] = 'product-not-found';
              }
            } catch (error: any) {
              console.error(`Failed to load handle for product ${item.productId}:`, error);
              
              // Instead of marking for removal, just use a fallback slug
              newHandles[item.productId] = 'product-not-found';
              
              // Log the error for debugging but don't remove the item
              if (error.message?.includes('No product ID was found')) {
                console.warn(`Product with ID ${item.productId} not found in WooCommerce, but keeping in cart`);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing product ${item.productId}:`, error);
        }
      }
      
      // Don't automatically remove items as this causes the disappearing cart issue
      // Instead, let the user manually remove items if needed
      
      if (Object.keys(newHandles).length > 0) {
        setProductHandles(prev => ({ ...prev, ...newHandles }));
      }
    };
    
    loadProductHandles();
  }, [items, productHandles]);
  
  // Handle quantity updates
  const handleQuantityUpdate = async (id: string, newQuantity: number) => {
    setQuantityUpdateInProgress(true);

    try {
      await updateItem(id, newQuantity);
      cartEvents.itemUpdated(id, newQuantity, 'Item quantity updated');
    } catch (error) {
      console.error('Error updating quantity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update quantity';
      setError(errorMessage);
      notificationEvents.show(errorMessage, 'error');
    } finally {
      setQuantityUpdateInProgress(false);
    }
  };
  
  // Handle removing items
  const handleRemoveItem = async (id: string) => {
    try {
      await removeItem(id);
      cartEvents.itemRemoved(id, 'Item removed from cart');
    } catch (error) {
      console.error('Error removing item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove item';
      setError(errorMessage);
      notificationEvents.show(errorMessage, 'error');
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    try {
      await clearCart();
      cartEvents.cleared('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear cart';
      notificationEvents.show(errorMessage, 'error');
    }
  };

  // Handle checkout process
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      // Validate that we have items in the cart
      if (items.length === 0) {
        throw new Error('Your cart is empty');
      }

      // Close the cart drawer first
      toggleCart();

      // Redirect to our custom checkout page
      // The middleware will handle authentication and redirect to sign-in if needed
      router.push('/checkout');

      // Reset loading state after a short delay to account for navigation
      setTimeout(() => {
        setCheckoutLoading(false);
      }, 1000);

    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'An error occurred during checkout');

      // Display a toast message via events
      notificationEvents.show(
        error instanceof Error ? error.message : 'An error occurred during checkout',
        'error'
      );

      setCheckoutLoading(false);
    }
  };
  
  // Handle retry for errors
  const handleRetry = async () => {
    setIsRetrying(true);
    setCheckoutError(null);
    
    try {
      // Retry the checkout process
      await handleCheckout();
    } catch (error) {
      console.error('Retry error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Get fallback image URL
  const getImageUrl = (item: CartItem) => {
    return item.image?.url || '/placeholder-product.jpg';
  };
  
  const hasItems = items.length > 0;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Cart backdrop clicked');
              toggleCart();
            }}
            className="cart-overlay fixed inset-0 bg-black/50"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="cart-sidebar fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col"
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Your Cart
              </h2>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Cart close button clicked');
                  toggleCart();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors z-10 relative"
                aria-label="Close cart"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Empty Cart State */}
              {!hasItems && !initializationError && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mb-2" />
                  <h3 className="text-lg font-medium mb-1">Your cart is empty</h3>
                  <p className="text-gray-500 mb-4">Looks like you haven't added any items yet.</p>
                  <Button 
                    onClick={toggleCart}
                    className="flex items-center gap-2"
                  >
                    Continue Shopping
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Error State */}
              {initializationError && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <AlertTriangle className="h-12 w-12 text-red-500 mb-2" />
                  <h3 className="text-lg font-medium mb-1">Something went wrong</h3>
                  <p className="text-gray-500 mb-4">{initializationError}</p>
                  <Button 
                    onClick={() => setError(null)}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* Cart Items */}
              {hasItems && (
                <ul className="divide-y">
                  {items.map(item => (
                    <CartItem
                      key={item.id}
                      item={item}
                      updateQuantity={handleQuantityUpdate}
                      removeFromCart={handleRemoveItem}
                      formatPrice={safeFormatPrice}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Cart Footer */}
            <div className="border-t p-4 space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{currencySymbol}{subtotalFormatted}</span>
              </div>
              
              {/* Total */}
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{currencySymbol}{totalFormatted}</span>
              </div>
              
              {/* Checkout Button */}
              <div className="mb-4">
                <Button 
                  onClick={handleCheckout}
                  disabled={!hasItems || quantityUpdateInProgress || checkoutLoading}
                  className="w-full h-12 bg-[#2c2c27] text-[#f4f3f0] hover:bg-[#3d3d35] font-medium transition-colors"
                  size="lg"
                >
                  {checkoutLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#f4f3f0] border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Proceed to Checkout
                    </>
                  )}
                </Button>
              </div>
              
              {/* Error Message */}
              {checkoutError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-red-700">{checkoutError}</p>
                      <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="mt-2 text-xs flex items-center text-red-700 hover:text-red-800"
                      >
                        {isRetrying ? (
                          <>
                            <Loader className="h-3 w-3 animate-spin mr-1" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Try again
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Offline Warning */}
              {!navigator.onLine && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                  <div className="flex items-center">
                    <WifiOff className="h-4 w-4 text-yellow-500 mr-2" />
                    <p className="text-xs text-yellow-700">
                      You appear to be offline. Please check your internet connection.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Cart Button */}
            <Button
              onClick={handleClearCart}
              variant="ghost"
              size="sm"
              disabled={checkoutLoading || quantityUpdateInProgress || !hasItems}
              className="w-full text-center text-[#8a8778] hover:text-[#2c2c27] hover:bg-[#f4f3f0] mt-2 transition-colors"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Cart
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

interface CartItemProps {
  item: CartItem;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  formatPrice: (price: string | number) => string;
}

const CartItem: React.FC<CartItemProps> = ({ item, updateQuantity, removeFromCart, formatPrice }) => {
  const handleIncrement = () => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    removeFromCart(item.id);
  };

  return (
    <li className="flex gap-4 py-4 border-b">
      {/* Product Image */}
      <div className="relative h-20 w-20 bg-gray-100 flex-shrink-0">
        {item.image?.url && (
          <Image
            src={item.image.url}
            alt={item.image.altText || item.name}
            fill
            sizes="80px"
            className="object-cover"
            priority={false}
          />
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col">
        <h4 className="text-sm font-medium line-clamp-2">{item.name}</h4>
        
        {/* Attributes */}
        {item.attributes && item.attributes.length > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            {item.attributes.map((attr, index) => (
              <span key={attr.name}>
                {attr.name}: {attr.value}
                {index < item.attributes!.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}
        
        {/* Price */}
        <div className="mt-1 text-sm font-medium">
          {item.price && typeof item.price === 'string' && item.price.toString().includes('₹') 
            ? item.price 
            : `${DEFAULT_CURRENCY_SYMBOL}${formatPrice(item.price || '0')}`}
        </div>

        {/* Quantity Controls */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center border border-gray-300">
            <button
              onClick={handleDecrement}
              disabled={item.quantity <= 1}
              className="px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="px-2 py-1 text-sm">{item.quantity}</span>
            <button
              onClick={handleIncrement}
              className="px-2 py-1 hover:bg-gray-100"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          
          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="p-1 hover:bg-gray-100 rounded-full"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </li>
  );
};

export default Cart; 