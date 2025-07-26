/**
 * @deprecated This file is deprecated. Please use clientAuth.ts instead.
 * This file is maintained for backward compatibility only.
 */

// Re-export everything from clientAuth
export * from './clientAuth';

// Log a warning in development
if (process.env.NODE_ENV !== 'production') {
  console.warn(
    'Warning: wooAuth.ts is deprecated and will be removed in a future version. ' +
    'Please import from "@/lib/clientAuth" instead.'
  );
}