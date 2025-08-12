'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import * as wooAuth from '@/lib/clientAuth';
import { useCustomer } from '@/components/providers/CustomerProvider';
import FaceIDSetup from './FaceIDSetup';
import FaceIDSignIn from './FaceIDSignIn';

interface AuthFormProps {
  mode: 'login' | 'register';
  redirectUrl?: string;
}

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData extends LoginFormData {
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, redirectUrl = '/' }) => {
  const router = useRouter();
  const { refreshCustomer } = useCustomer();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [showFaceIDSetup, setShowFaceIDSetup] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  
  const isLogin = mode === 'login';
  
  // Use React Hook Form for form validation
  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<RegisterFormData>({
    mode: 'onBlur'
  });
  
  // For password confirmation validation
  const password = watch('password', '');

  const handleFaceIDSetupSuccess = () => {
    // After Face ID setup, redirect to the intended page
    setTimeout(() => {
      router.push(redirectUrl);
      router.refresh();
    }, 1000);
  };

  const handleFaceIDSkip = () => {
    // Skip Face ID setup and redirect
    router.push(redirectUrl);
    router.refresh();
  };

  const handleFaceIDLoginSuccess = async (user: any) => {
    setSuccess('Face ID authentication successful! Redirecting...');
    
    // Refresh customer data to update authentication state
    setTimeout(async () => {
      await refreshCustomer();
      router.push(redirectUrl);
      router.refresh();
    }, 500);
  };

  const handleFaceIDLoginError = (error: string) => {
    setError(error);
  };
  
  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setDebugInfo(null);
    
    try {
      if (isLogin) {
        // Login with WooCommerce
        console.log('Attempting login with:', data.email);
        
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'login',
            username: data.email,
            password: data.password,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setSuccess('Login successful! Redirecting...');

          // Refresh customer data to update authentication state
          setTimeout(async () => {
            await refreshCustomer();
            router.push(redirectUrl);
            router.refresh(); // Refresh to update UI based on auth state
          }, 500);
        } else {
          setError(result.message || 'Login failed. Please check your credentials.');
          // Add debug info
          if (process.env.NODE_ENV !== 'production') {
            setDebugInfo(`Status: ${response.status}. Check console for more details.`);
            console.error('Login response:', result);
          }
        }
      } else {
        // Register with WooCommerce
        console.log('Attempting registration for:', data.email);
        
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'register',
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            password: data.password,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setSuccess('Registration successful!');

          // Refresh customer data immediately to update navbar and auth state
          await refreshCustomer();

          // Store user data for Face ID setup
          setRegisteredUser({
            id: result.customer?.databaseId || result.customer?.id || data.email,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName
          });

          // Show Face ID setup option
          setShowFaceIDSetup(true);
        } else {
          setError(result.message || 'Registration failed. Please try again.');
          // Add debug info
          if (process.env.NODE_ENV !== 'production') {
            setDebugInfo(`Status: ${response.status}. Check console for more details.`);
            console.error('Registration response:', result);
          }
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'An error occurred during authentication');
      setSuccess(null);
      
      // Add debug info
      if (process.env.NODE_ENV !== 'production') {
        setDebugInfo('Network or server error. Check console for details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show Face ID setup after successful registration
  if (showFaceIDSetup && registeredUser && !isLogin) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 border border-gray-200">
        <FaceIDSetup
          userId={registeredUser.id}
          userEmail={registeredUser.email}
          userName={`${registeredUser.firstName} ${registeredUser.lastName}`}
          onSuccess={handleFaceIDSetupSuccess}
          onSkip={handleFaceIDSkip}
          isOptional={true}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 border border-gray-200">
      <h2 className="text-2xl font-serif mb-6 text-center">
        {isLogin ? 'Sign In to Your Account' : 'Create an Account'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm border border-green-200">
          {success}
        </div>
      )}
      
      {debugInfo && process.env.NODE_ENV !== 'production' && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 text-xs border border-yellow-200 font-mono">
          Debug: {debugInfo}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Registration-only fields */}
        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`w-full p-2 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                  {...register('firstName', { 
                    required: 'First name is required' 
                  })}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`w-full p-2 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                  {...register('lastName', { 
                    required: 'Last name is required' 
                  })}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Common fields */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className={`w-full p-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={`w-full p-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
              }
            })}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>
        
        {/* Registration-only fields */}
        {!isLogin && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`w-full p-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#2c2c27] text-white py-2 px-4 hover:bg-[#4c4c47] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {isLogin ? 'Signing in...' : 'Creating account...'}
            </span>
          ) : (
            isLogin ? 'Sign In' : 'Create Account'
          )}
        </button>
      </form>
      
      {/* Face ID login option for login mode */}
      {isLogin && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>
          
          <div className="mt-6">
            <FaceIDSignIn
              onSuccess={handleFaceIDLoginSuccess}
              onError={handleFaceIDLoginError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthForm; 