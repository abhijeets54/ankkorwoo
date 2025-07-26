import React from 'react';
import dynamic from 'next/dynamic';

// Import with dynamic to handle possible import failures
const LaunchingStateInitializer = dynamic(
  () => import('./LaunchingStateInitializer'),
  { ssr: true, loading: () => null }
);

/**
 * Server component to get the launching state from environment variables
 * This component will always read the most current value from the server environment
 */
export default function LaunchingStateServer() {
  // Read the environment variable from the server side
  // Convert string 'true'/'false' to boolean
  const launchingState = process.env.NEXT_PUBLIC_LAUNCHING_SOON === 'true';
  
  // Pass the value to the client component with error handling
  return <LaunchingStateInitializer launchingState={launchingState} />;
} 