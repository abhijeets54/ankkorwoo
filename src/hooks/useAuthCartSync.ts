import { useEffect, useRef, useState } from 'react';
import { useCustomer } from '@/components/providers/CustomerProvider';
import { useCartStore, useWishlistStore, WishlistItem } from '@/lib/store';

// Helper functions for wishlist sync
const fetchUserWishlist = async (): Promise<WishlistItem[]> => {
  try {
    const response = await fetch('/api/user/wishlist', {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return data.wishlist || [];
    }
  } catch (error) {
    console.error('Error fetching user wishlist:', error);
  }
  return [];
};

const saveUserWishlist = async (wishlist: WishlistItem[]): Promise<void> => {
  try {
    await fetch('/api/user/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ wishlist }),
    });
  } catch (error) {
    console.error('Error saving user wishlist:', error);
  }
};

const mergeWishlists = (local: WishlistItem[], saved: WishlistItem[]): WishlistItem[] => {
  const merged = [...local];

  saved.forEach(savedItem => {
    const exists = merged.some(localItem => localItem.id === savedItem.id);
    if (!exists) {
      merged.push(savedItem);
    }
  });

  return merged;
};

/**
 * Hook to synchronize authentication state with cart and wishlist state.
 * Ensures cart is properly handled when user signs in or out, and manages
 * wishlist synchronization between guest and authenticated states.
 */
export function useAuthCartSync() {
  const { isAuthenticated, customer } = useCustomer();
  const cartStore = useCartStore();
  const wishlistStore = useWishlistStore();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Use refs to track previous authentication state and customer ID
  const prevAuthRef = useRef(isAuthenticated);
  const prevCustomerIdRef = useRef(customer?.id || null);
  
  // Effect to handle auth state changes
  useEffect(() => {
    // Skip if already syncing to prevent loops
    if (isSyncing) return;
    
    // Function to clear cart and wishlist data on logout
    const handleLogout = async () => {
      setIsSyncing(true);
      console.log('Auth state changed: User logged out - resetting cart and wishlist');
      
      try {
        // Clear cart
        await cartStore.clearCart();
        
        // Store current wishlist items in session storage for potential recovery
        if (typeof window !== 'undefined' && wishlistStore.items.length > 0) {
          try {
            sessionStorage.setItem(
              'ankkor_temp_wishlist', 
              JSON.stringify(wishlistStore.items)
            );
            console.log('Saved wishlist items to session storage for recovery');
          } catch (error) {
            console.error('Failed to save wishlist to session storage:', error);
          }
        }
        
        // Clear any indicators in session storage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('cartInitialized');
        }
        
        // Re-initialize the cart
        await cartStore.initCart();
        
        // Mark as initialized again
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cartInitialized', 'true');
        }
      } catch (error) {
        console.error('Error handling logout:', error);
      } finally {
        setIsSyncing(false);
      }
    };
    
    // Function to handle login and merge guest cart/wishlist with account
    const handleLogin = async () => {
      setIsSyncing(true);
      console.log('Auth state changed: User logged in - syncing cart and wishlist');
      
      try {
        // Cart sync happens automatically through Shopify's API when authenticated
        
        // Show a tooltip or notification that the cart was transferred if needed
        // This could integrate with a toast/notification system
        
        // Sync wishlist with user profile
        await syncWishlistOnLogin();
      } catch (error) {
        console.error('Error handling login:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Function to sync wishlist on login
    const syncWishlistOnLogin = async () => {
      try {
        // Get current local wishlist
        const localWishlist = wishlistStore.items;

        // Try to get saved wishlist from user profile/session
        const savedWishlist = await fetchUserWishlist();

        if (savedWishlist && savedWishlist.length > 0) {
          // Merge local and saved wishlists (remove duplicates)
          const mergedWishlist = mergeWishlists(localWishlist, savedWishlist);

          // Update local store with merged data
          wishlistStore.clearWishlist();
          mergedWishlist.forEach(item => wishlistStore.addToWishlist(item));

          console.log('Wishlist synced from user profile');
        } else if (localWishlist.length > 0) {
          // Save current local wishlist to user profile
          await saveUserWishlist(localWishlist);
          console.log('Local wishlist saved to user profile');
        }
      } catch (error) {
        console.error('Error syncing wishlist on login:', error);
      }
    };

    // Function to save wishlist on logout
    const saveWishlistOnLogout = async () => {
      try {
        const currentWishlist = wishlistStore.items;
        if (currentWishlist.length > 0) {
          await saveUserWishlist(currentWishlist);
          console.log('Wishlist saved before logout');
        }
      } catch (error) {
        console.error('Error saving wishlist on logout:', error);
      }
    };

    // Check if auth state changed
    if (prevAuthRef.current !== isAuthenticated) {
      if (isAuthenticated) {
        // User just logged in
        handleLogin();
      } else {
        // User just logged out - save wishlist first then logout
        const handleLogoutSequence = async () => {
          await saveWishlistOnLogout();
          handleLogout();
        };
        handleLogoutSequence();
      }
    } else if (isAuthenticated && customer?.id !== prevCustomerIdRef.current) {
      // User switched accounts while staying logged in
      handleLogin();
    }
    
    // Update the refs for the next render
    prevAuthRef.current = isAuthenticated;
    prevCustomerIdRef.current = customer?.id || null;
    
  }, [isAuthenticated, customer?.id, cartStore, wishlistStore, isSyncing]);
  
  return null;
} 