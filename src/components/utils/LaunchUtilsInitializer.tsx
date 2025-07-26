'use client';

import { useEffect } from 'react';
import { initializeLaunchingUtils } from '@/lib/launchingUtils';

/**
 * A client component that initializes the launching utilities.
 * This component doesn't render anything visible.
 */
const LaunchUtilsInitializer = () => {
  useEffect(() => {
    // Initialize the launching utilities when the component mounts
    initializeLaunchingUtils();
    
    // Log a message to the console to let developers know about the utilities
    if (process.env.NODE_ENV === 'development') {
      console.info(
        '%c🚀 Ankkor Launch Utilities Available %c\n' +
        'window.ankkor.enableLaunchingSoon() - Enable the launching soon screen\n' +
        'window.ankkor.disableLaunchingSoon() - Disable the launching soon screen\n' +
        'window.ankkor.getLaunchingSoonStatus() - Check if launching soon is enabled',
        'background: #2c2c27; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
        'color: #5c5c52; font-size: 0.9em;'
      );
    }
  }, []);

  return null; // This component doesn't render anything
};

export default LaunchUtilsInitializer; 