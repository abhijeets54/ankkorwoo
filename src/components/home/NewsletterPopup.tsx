'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useForm, ValidationError } from '@formspree/react';

// Define the form data type for TypeScript
interface FormValues extends Record<string, any> {
  name: string;
  email: string;
  interest: string;
  form_type: string;
}

const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use environment variable for Formspree form ID
  const FORM_ID = process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID || 'xblgekrr';
  
  // Use the useForm hook from @formspree/react
  const [state, handleSubmit] = useForm<FormValues>(FORM_ID, {
    data: {
      form_type: 'preferences' // Add form type to distinguish from contact form
    }
  });

  useEffect(() => {
    // Show popup after 2 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Close popup after successful submission
  useEffect(() => {
    if (state.succeeded) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.succeeded]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white max-w-md w-full rounded-sm p-8 relative"
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#5c5c52] hover:text-[#2c2c27] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-serif font-bold text-[#2c2c27] mb-4">
              Welcome to Ankkor
            </h2>
            <p className="text-[#5c5c52] mb-6">
              Tell us about your preferences, check out our website for whole range of collections.
            </p>

            {state.succeeded ? (
              <div className="text-center py-8">
                <p className="text-[#2c2c27] font-medium">Thank you for sharing your preferences!</p>
                <p className="text-[#5c5c52] text-sm mt-2">We'll use this information to better serve you.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="popup-name" className="block text-sm font-medium text-[#2c2c27] mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="popup-name"
                    required
                    placeholder="Enter your name"
                    className="w-full px-4 py-2.5 border border-[#e5e2d9] focus:outline-none focus:border-[#2c2c27] text-[#2c2c27] placeholder-[#8a8778] transition-colors"
                  />
                  <ValidationError prefix="Name" field="name" errors={state.errors} className="text-red-600 text-sm mt-1" />
                </div>

                <div>
                  <label htmlFor="popup-email" className="block text-sm font-medium text-[#2c2c27] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="popup-email"
                    required
                    placeholder="Enter your email"
                    className="w-full px-4 py-2.5 border border-[#e5e2d9] focus:outline-none focus:border-[#2c2c27] text-[#2c2c27] placeholder-[#8a8778] transition-colors"
                  />
                  <ValidationError prefix="Email" field="email" errors={state.errors} className="text-red-600 text-sm mt-1" />
                </div>

                <div>
                  <label htmlFor="interest" className="block text-sm font-medium text-[#2c2c27] mb-1.5">
                    What are you looking for?
                  </label>
                  <select
                    name="interest"
                    id="interest"
                    required
                    defaultValue=""
                    className="w-full px-4 py-2.5 border border-[#e5e2d9] focus:outline-none focus:border-[#2c2c27] text-[#2c2c27] appearance-none bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%235c5c52%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[right_1rem_center] bg-no-repeat cursor-pointer transition-colors"
                  >
                    <option value="" disabled>Select an option</option>
                    <option value="shirts">Premium Formal Shirts</option>
                    <option value="polos">Classic Polo T-shirts</option>
                    <option value="pants">Tailored Pants</option>
                    <option value="accessories">Luxury Accessories</option>
                  </select>
                  <ValidationError prefix="Interest" field="interest" errors={state.errors} className="text-red-600 text-sm mt-1" />
                </div>

                {state.errors && (
                  <p className="text-red-600 text-sm">
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state.submitting}
                  className="w-full bg-[#2c2c27] text-white py-3 hover:bg-[#3d3d35] transition-colors text-sm tracking-wider uppercase font-medium disabled:opacity-50"
                >
                  {state.submitting ? 'Submitting...' : 'Submit'}
                </button>

                <p className="text-[#8a8778] text-xs text-center">
                  We'll never spam you, Promise ❤️
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewsletterPopup;