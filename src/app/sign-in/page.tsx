'use client';

import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif mb-8 text-center">Sign In</h1>
        <AuthForm mode="login" redirectUrl={redirectUrl} />
        
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <a href="/sign-up" className="text-[#2c2c27] underline hover:text-[#8a8778]">
              Create one here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 