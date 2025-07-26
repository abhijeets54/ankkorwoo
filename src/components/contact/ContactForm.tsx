'use client';

import React from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useForm, ValidationError } from '@formspree/react';
import Loader from '@/components/ui/loader';

// Define the form data type for TypeScript (use Record<string, any> to satisfy FieldValues constraint)
interface FormValues extends Record<string, any> {
  name: string;
  email: string;
  subject: string;
  message: string;
  form_type: string;
}

const ContactForm = () => {
  // Use environment variable for Formspree form ID
  const FORM_ID = process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID || 'xblgekrr';
  
  // Use the useForm hook from @formspree/react
  const [state, handleSubmit] = useForm<FormValues>(FORM_ID, {
    data: {
      form_type: 'contact' // Add form type to distinguish from newsletter
    }
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {state.succeeded ? (
        <div className="bg-[#f4f3f0] p-8 rounded-lg text-center">
          <CheckCircle className="w-16 h-16 text-[#2c2c27] mx-auto mb-4" />
          <h3 className="font-serif text-2xl font-bold text-[#2c2c27] mb-2">Message Sent</h3>
          <p className="text-[#5c5c52] mb-6">
            Thank you for contacting us. We have received your message and will respond shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#2c2c27] text-[#f4f3f0] px-6 py-3 text-sm uppercase tracking-wider hover:bg-[#3d3d35] transition-colors"
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {state.errors && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-red-800 font-medium">Error</h4>
                <p className="text-red-700 text-sm">
                  There was a problem sending your message. Please try again later.
                </p>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-[#5c5c52] mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="w-full border border-[#e5e2d9] bg-[#f8f8f5] p-3 focus:border-[#8a8778] focus:outline-none focus:ring-1 focus:ring-[#8a8778]"
              required
            />
            <ValidationError prefix="Name" field="name" errors={state.errors} className="text-red-500 text-sm mt-1" />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-[#5c5c52] mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full border border-[#e5e2d9] bg-[#f8f8f5] p-3 focus:border-[#8a8778] focus:outline-none focus:ring-1 focus:ring-[#8a8778]"
              required
            />
            <ValidationError prefix="Email" field="email" errors={state.errors} className="text-red-500 text-sm mt-1" />
          </div>
          
          <div>
            <label htmlFor="subject" className="block text-[#5c5c52] mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              className="w-full border border-[#e5e2d9] bg-[#f8f8f5] p-3 focus:border-[#8a8778] focus:outline-none focus:ring-1 focus:ring-[#8a8778]"
              required
            />
            <ValidationError prefix="Subject" field="subject" errors={state.errors} className="text-red-500 text-sm mt-1" />
          </div>
          
          <div>
            <label htmlFor="message" className="block text-[#5c5c52] mb-1">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              className="w-full border border-[#e5e2d9] bg-[#f8f8f5] p-3 focus:border-[#8a8778] focus:outline-none focus:ring-1 focus:ring-[#8a8778]"
              required
            />
            <ValidationError prefix="Message" field="message" errors={state.errors} className="text-red-500 text-sm mt-1" />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={state.submitting}
              className="bg-[#2c2c27] text-[#f4f3f0] px-8 py-3 flex items-center justify-center text-sm uppercase tracking-wider hover:bg-[#3d3d35] transition-colors disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {state.submitting ? (
                <>
                  <Loader size="sm" color="#f4f3f0" className="mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </button>
          </div>
          
          {/* Show any additional form errors */}
          <ValidationError errors={state.errors} />
        </form>
      )}
    </div>
  );
};

export default ContactForm; 