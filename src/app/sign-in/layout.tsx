import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Ankkor',
  description: 'Sign in to your Ankkor account to access your orders, wishlist, and more.',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 