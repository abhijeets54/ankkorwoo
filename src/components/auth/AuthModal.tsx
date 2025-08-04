'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useCustomer } from '@/components/providers/CustomerProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  redirectUrl = '/' 
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();
  const { refreshCustomer } = useCustomer();
  
  const isLogin = mode === 'login';
  
  // Form handling
  const { 
    register, 
    handleSubmit, 
    watch,
    reset,
    formState: { errors } 
  } = useForm<RegisterFormData>({
    mode: 'onBlur'
  });
  
  const password = watch('password', '');
  
  // Reset form when mode changes
  React.useEffect(() => {
    if (isOpen) {
      reset();
      setError(null);
      setSuccess(null);
    }
  }, [mode, isOpen, reset]);
  
  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isLogin) {
        // Login request
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
          setSuccess('Login successful!');
          
          // Refresh customer data to update authentication state
          setTimeout(async () => {
            await refreshCustomer();
            
            // Call success callback if provided
            if (onSuccess) {
              onSuccess();
            }
            
            // Close modal
            onClose();
            
            // Navigate to redirect URL
            router.push(redirectUrl);
            router.refresh();
          }, 800);
        } else {
          setError(result.message || 'Login failed. Please check your credentials.');
        }
      } else {
        // Registration request
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
          setSuccess('Registration successful! Redirecting...');
          
          // Refresh customer data immediately
          await refreshCustomer();
          
          // Call success callback if provided
          if (onSuccess) {
            onSuccess();
          }
          
          // Close modal and redirect
          setTimeout(() => {
            onClose();
            router.push(redirectUrl);
            router.refresh();
          }, 1000);
        } else {
          setError(result.message || 'Registration failed. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative top border */}
              <div className="h-1 bg-gradient-to-r from-[#2c2c27] via-[#8a8778] to-[#2c2c27]" />
              
              {/* Header */}
              <div className="relative bg-gradient-to-r from-[#2c2c27] to-[#3d3d35] px-6 py-8 text-center">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-serif text-white">
                    {isLogin ? 'Welcome Back' : 'Sign Up'}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {isLogin 
                      ? 'Sign in to continue with your checkout' 
                      : 'Create an account to complete your purchase'
                    }
                  </p>
                </div>
              </div>
              
              {/* Form Content */}
              <div className="px-6 py-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}
                
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-green-50 text-green-700 text-sm border border-green-200 rounded-lg"
                  >
                    {success}
                  </motion.div>
                )}
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Registration-only fields */}
                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2c2c27] focus:border-transparent outline-none transition-all ${
                            errors.firstName ? 'border-red-500' : 'border-gray-300'
                          }`}
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
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2c2c27] focus:border-transparent outline-none transition-all ${
                            errors.lastName ? 'border-red-500' : 'border-gray-300'
                          }`}
                          {...register('lastName', { 
                            required: 'Last name is required' 
                          })}
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2c2c27] focus:border-transparent outline-none transition-all ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
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
                  
                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#2c2c27] focus:border-transparent outline-none transition-all ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        {...register('password', { 
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters'
                          }
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                  
                  {/* Confirm Password (Registration only) */}
                  {!isLogin && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#2c2c27] focus:border-transparent outline-none transition-all ${
                            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                          {...register('confirmPassword', { 
                            required: 'Please confirm your password',
                            validate: value => value === password || 'Passwords do not match'
                          })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#2c2c27] text-white py-3 px-4 rounded-lg hover:bg-[#3d3d35] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        {isLogin ? 'Signing in...' : 'Creating account...'}
                      </span>
                    ) : (
                      isLogin ? 'Sign In & Continue' : 'Create Account & Continue'
                    )}
                  </button>
                </form>
                
                {/* Toggle Mode */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button
                      onClick={toggleMode}
                      className="ml-1 text-[#2c2c27] hover:text-[#3d3d35] font-medium underline"
                    >
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
                
                {/* Additional Links */}
                {isLogin && (
                  <div className="mt-4 text-center">
                    <a 
                      href="/forgot-password" 
                      className="text-sm text-[#2c2c27] hover:text-[#3d3d35] underline"
                      onClick={onClose}
                    >
                      Forgot your password?
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;