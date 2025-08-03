'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authEvents, notificationEvents } from '@/lib/eventBus';

// Auth context interface
export interface AuthContextValue {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  clearError: () => void;
}

// Registration data interface
export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from cookies/localStorage
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    // Skip auth initialization during build/SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Check if user is already authenticated
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      console.log('Auth initialization response:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Auth initialization data:', data);
        if (data.success && data.user) {
          setUser(data.user);
          setToken(data.token || 'authenticated'); // Fallback for cookie-based auth
          console.log('User authenticated:', data.user.email);
        } else {
          console.log('Auth initialization failed:', data.message);
        }
      } else if (response.status === 401) {
        // Token might be expired - try to refresh
        console.log('Auth initialization failed with 401, attempting token refresh');
        await refreshSession();
      } else {
        console.log('Auth initialization response not ok:', response.status);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          username: email,
          password,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        setToken(result.token || 'authenticated');
        
        // Emit success event for other components
        authEvents.loginSuccess(result.user, result.token || 'authenticated');
        notificationEvents.show('Login successful!', 'success');
      } else {
        const errorMessage = result.message || 'Login failed';
        setError(errorMessage);
        authEvents.loginError(errorMessage);
        notificationEvents.show(errorMessage, 'error');
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      authEvents.loginError(errorMessage);
      notificationEvents.show(errorMessage, 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          ...userData,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        setToken(result.token || 'authenticated');
        
        // Emit success event for other components
        authEvents.registerSuccess(result.user, result.token || 'authenticated');
        notificationEvents.show('Registration successful!', 'success');
      } else {
        const errorMessage = result.message || 'Registration failed';
        setError(errorMessage);
        authEvents.registerError(errorMessage);
        notificationEvents.show(errorMessage, 'error');
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      setError(errorMessage);
      authEvents.registerError(errorMessage);
      notificationEvents.show(errorMessage, 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logout',
        }),
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Clear state regardless of API call result
    setUser(null);
    setToken(null);
    setError(null);
    
    // Emit logout event for other components
    authEvents.logout();
    notificationEvents.show('Logged out successfully', 'info');
    
    setIsLoading(false);
  };

  const refreshSession = async () => {
    // Skip refresh during build/SSR
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // First try to refresh the token if it's expired
      const refreshResponse = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refresh',
        }),
        credentials: 'include',
      });

      // If refresh was successful, try to get user data
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          console.log('Token refreshed successfully in AuthContext');
        }
      }

      // Now try to get the current user (whether refresh worked or not)
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          setToken(data.token || 'authenticated');
          console.log('Session refreshed successfully for user:', data.user.email);
          return;
        }
      }

      // If we get here, session is invalid
      console.log('Session refresh failed, clearing state');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setUser(null);
      setToken(null);
    }
  };

  const updateProfile = async (data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        authEvents.profileUpdated(result.user);
        notificationEvents.show('Profile updated successfully!', 'success');
        return result.user;
      } else {
        const errorMessage = result.message || 'Profile update failed';
        setError(errorMessage);
        notificationEvents.show(errorMessage, 'error');
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Profile update failed';
      setError(errorMessage);
      notificationEvents.show(errorMessage, 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const isAuthenticated = !!user && !!token;

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshSession,
    updateProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
