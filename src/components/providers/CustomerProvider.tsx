'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  logout as logoutClient,
  login as loginClient,
  register as registerClient,
  getCurrentCustomer
} from '@/lib/clientAuth';
import { updateCustomerProfile } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
import { useCartStore } from '@/lib/wooStore';
import { useAuthCartSync } from '@/hooks/useAuthCartSync';

// Customer context type
interface CustomerContextType {
  customer: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (credentials: {email: string, password: string}) => Promise<void>;
  register: (registration: {email: string, firstName: string, lastName: string, password: string}) => Promise<void>;
  logout: () => void;
  updateProfile: (data: any) => Promise<{customer: any, accessToken: string, expiresAt: string} | void>;
  error: string | null;
  refreshCustomer: () => Promise<void>;
}

// Create the context
const CustomerContext = createContext<CustomerContextType>({
  customer: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateProfile: async () => {},
  error: null,
  refreshCustomer: async () => {}
});

// Custom hook to use the customer context
export const useCustomer = () => useContext(CustomerContext);

// Provider component
export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const { addToast } = useToast();

  // Initialize auth cart sync
  useAuthCartSync();



  // Transform customer data to ensure it has all required fields
  const transformCustomerData = (customerData: any) => {
    if (!customerData) return null;

    return {
      ...customerData,
      displayName: customerData.displayName || customerData.username || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || 'User'
    };
  };

  // Check authentication and get customer data from API
  const checkAuthAndGetCustomer = async () => {
    try {
      console.log('CustomerProvider: Checking authentication via /api/auth/me');
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include HTTP-only cookies
      });

      console.log('CustomerProvider: Auth API response status:', response.status);
      const result = await response.json();
      console.log('CustomerProvider: Auth API result:', result);

      if (result.success && result.customer) {
        // Get token from API response (more secure than client-side cookies)
        const apiToken = result.token;
        console.log('CustomerProvider: Token from API response:', !!apiToken);
        setToken(apiToken || null);
        return { success: true, customer: result.customer, token: apiToken };
      } else {
        // Clear token if authentication failed
        setToken(null);
        return { success: false, message: result.message || 'Not authenticated' };
      }
    } catch (error) {
      console.error('CustomerProvider: Error checking authentication:', error);
      // Clear token on error
      setToken(null);
      return { success: false, message: 'Network error' };
    }
  };

  // Refresh customer data
  const refreshCustomer = async () => {
    try {
      const result = await checkAuthAndGetCustomer();
      if (result.success) {
        // Add token to customer object
        const customerWithToken = {
          ...result.customer,
          token: result.token
        };

        setCustomer(transformCustomerData(customerWithToken));
        console.log('Customer data refreshed successfully');
        console.log('Token available after refresh:', !!result.token);
      } else {
        console.log('Failed to refresh customer data:', result.message);
        setCustomer(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Error refreshing customer data:', err);
      setCustomer(null);
      setToken(null);
    }
  };

  // Check if the customer is logged in on mount
  useEffect(() => {
    const checkCustomerSession = async () => {
      try {
        setIsLoading(true);

        // Check authentication and get customer data from API
        const result = await checkAuthAndGetCustomer();
        if (result.success) {
          console.log('Found valid authentication, customer data loaded');
          console.log('Token available on mount:', !!result.token);

          // Add token to customer object
          const customerWithToken = {
            ...result.customer,
            token: result.token
          };

          setCustomer(transformCustomerData(customerWithToken));
        } else {
          console.log('No valid authentication found:', result.message);
          setCustomer(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Error checking customer session:', err);
        // On error, clear any potentially corrupted session data
        logoutClient();
        setCustomer(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkCustomerSession();
  }, []);

  // Logout function
  const logout = () => {
    logoutClient();
    setCustomer(null);
    setToken(null);
    console.log('Logout completed, token cleared');
    
    // Clear the cart data when the user logs out
    const cartStore = useCartStore.getState();
    
    // Clear the cart store to ensure all cart data is reset
    cartStore.clearCart().catch(error => {
      console.error('Error clearing cart during logout:', error);
      // Even if clearing cart fails, we should still proceed with local cleanup
    });
    
    // Reset cart initialization indicator in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('cartInitialized');
      
      // Ensure we clean up any error states
      sessionStorage.removeItem('cartInitializationAttempts');
    }
    
    // Show info toast notification
    addToast('You have been signed out successfully', 'info');
    
    router.push('/');
    router.refresh(); // Refresh to update UI based on auth state
  };

  // Parse and handle Shopify authentication errors with more specific messages
  const parseAuthError = (error: any): string => {
    if (!error) return 'An unknown error occurred';
    
    const errorMessage = typeof error === 'string' 
      ? error 
      : error.message || JSON.stringify(error);
    
    // Common Shopify customer auth errors
    if (errorMessage.includes('Unidentified customer')) {
      return 'The email or password you entered is incorrect. Please try again.';
    }
    
    if (errorMessage.includes('already associated')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    
    if (errorMessage.includes('password') && errorMessage.includes('too short')) {
      return 'Your password must be at least 8 characters. Please try again.';
    }
    
    if (errorMessage.includes('token') && (errorMessage.includes('expired') || errorMessage.includes('invalid'))) {
      return 'Your login session has expired. Please sign in again.';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    // Return the original error if no specific handling
    return errorMessage;
  };

  // Enhanced login function with better error handling
  const login = async (credentials: {email: string, password: string}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginClient(credentials.email, credentials.password);

      if (!result || !result.success || !result.user) {
        throw new Error('Login failed: No user data returned');
      }

      // Convert user to customer format and include the token
      const customer = {
        id: result.user.id,
        databaseId: result.user.databaseId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        token: result.token // Include token in customer object
      };

      setCustomer(transformCustomerData(customer));

      // Also set token in separate state for backward compatibility
      const loginToken = result.token;
      console.log('Login successful, token from API:', !!loginToken);
      setToken(loginToken || null);

      // Initialize a fresh cart after login to ensure it's associated with the customer
      const cartStore = useCartStore.getState();

      try {
        await cartStore.clearCart();
        // Initialize cart with the correct method
        await cartStore.initializeCart();
      } catch (cartError) {
        console.error('Error initializing cart after login:', cartError);
        // Don't fail the login process if cart initialization fails
      }

      // Show success toast notification
      addToast(`Welcome back, ${customer?.firstName || 'there'}!`, 'success');

      // Redirect to homepage instead of account page
      router.push('/');
    } catch (err) {
      const errorMessage = parseAuthError(err);
      setError(errorMessage);

      // Show error toast notification
      addToast(errorMessage, 'error');

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced register function with better error handling
  const register = async (registration: {email: string, firstName: string, lastName: string, password: string}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await registerClient(
        registration.email,
        registration.firstName,
        registration.lastName,
        registration.password
      );

      if (!result || !result.success || !result.customer) {
        throw new Error('Registration failed: No customer data returned');
      }

      // Add token to customer object
      const customerWithToken = {
        ...result.customer,
        token: result.token
      };

      setCustomer(transformCustomerData(customerWithToken));

      // Also set token in separate state for backward compatibility
      const registrationToken = result.token;
      console.log('Registration successful, token from API:', !!registrationToken);
      setToken(registrationToken || null);

      // Initialize a fresh cart after registration to ensure it's associated with the customer
      const cartStore = useCartStore.getState();

      try {
        await cartStore.clearCart();
        // Initialize cart with the correct method
        await cartStore.initializeCart();
      } catch (cartError) {
        console.error('Error initializing cart after registration:', cartError);
        // Don't fail the registration process if cart initialization fails
      }

      // Show success toast notification
      addToast(`Welcome to Ankkor, ${result.customer?.firstName}!`, 'success');

      // Redirect to homepage instead of account page
      router.push('/');
    } catch (err) {
      const errorMessage = parseAuthError(err);
      setError(errorMessage);

      // Show error toast notification
      addToast(errorMessage, 'error');

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update customer profile
  const updateProfile = async (data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await updateCustomerProfile(data);

      if (!result || !result.customer) {
        throw new Error('Profile update failed: No customer data returned');
      }

      // Update the customer state with the new data
      setCustomer(transformCustomerData(result.customer));

      // Show success toast notification
      addToast('Your profile has been updated successfully', 'success');

      return result;
    } catch (err) {
      const errorMessage = parseAuthError(err);
      setError(errorMessage);

      // Show error toast notification
      addToast(errorMessage, 'error');

      throw err;
    } finally {
      setIsLoading(false);
    }
  };





  // Calculate isAuthenticated from customer data
  const isAuthenticated = Boolean(customer);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isLoading,
        isAuthenticated,
        token,
        login,
        register,
        logout,
        updateProfile,
        error,
        refreshCustomer
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
} 