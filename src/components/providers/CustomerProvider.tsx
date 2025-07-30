'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Customer context type - now delegates to AuthContext
interface CustomerContextType {
  customer: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  login: (credentials: {email: string, password: string}) => Promise<void>;
  register: (registration: {email: string, firstName: string, lastName: string, password: string}) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  error: string | null;
  refreshCustomer: () => Promise<void>;
}

// Create the context with default values
const CustomerContext = createContext<CustomerContextType>({
  customer: null,
  isLoading: false,
  isAuthenticated: false,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  error: null,
  refreshCustomer: async () => {}
});

// Custom hook to use the customer context
export const useCustomer = () => useContext(CustomerContext);

// Customer provider component that delegates to AuthContext
export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();

  // Delegate all auth operations to AuthContext
  const login = async (credentials: {email: string, password: string}) => {
    await auth.login(credentials.email, credentials.password);
  };

  const register = async (registration: {email: string, firstName: string, lastName: string, password: string}) => {
    await auth.register(registration);
  };

  const logout = async () => {
    await auth.logout();
  };

  const updateProfile = async (data: any) => {
    return await auth.updateProfile(data);
  };

  const refreshCustomer = async () => {
    await auth.refreshSession();
  };

  const value: CustomerContextType = {
    customer: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    token: auth.token,
    login,
    register,
    logout,
    updateProfile,
    error: auth.error,
    refreshCustomer
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
};
