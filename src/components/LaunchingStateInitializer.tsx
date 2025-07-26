'use client';

import { useEffect } from 'react';
import { useLaunchingSoonStore } from './providers/LaunchingSoonProvider';

interface LaunchingStateInitializerProps {
  launchingState: boolean;
}

/**
 * This component is used to initialize the launching state from server-side props.
 * It ensures that the environment variable is properly passed to the client.
 */
export default function LaunchingStateInitializer({ launchingState }: LaunchingStateInitializerProps) {
  useEffect(() => {
    // Update the store with the server-provided value
    // This ensures the value comes from server environment variables
    const currentState = useLaunchingSoonStore.getState().isLaunchingSoon;
    
    if (currentState !== launchingState) {
      console.log('Updating launching state from server:', launchingState);
      useLaunchingSoonStore.setState({ isLaunchingSoon: launchingState });
    }
  }, [launchingState]);

  // This component doesn't render anything
  return null;
} 