import { Metadata } from 'next';
import AuthForm from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Create Account | Ankkor',
  description: 'Create an Ankkor account to enjoy a personalized shopping experience, track orders, and more.',
};

export default function SignUpPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif mb-8 text-center">Create Account</h1>
        <AuthForm mode="register" />
        
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/sign-in" className="text-[#2c2c27] underline hover:text-[#8a8778]">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 