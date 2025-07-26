/**
 * Utility functions for managing the "Launching Soon" mode
 * 
 * These functions can be called from the browser console to toggle the launching soon mode
 * But only in development mode - they're disabled in production for security
 * 
 * Example:
 * - To disable: window.ankkor.disableLaunchingSoon()
 * - To enable: window.ankkor.enableLaunchingSoon()
 * - To check status: window.ankkor.getLaunchingSoonStatus()
 */

// Define the type for our global window object extension
declare global {
  interface Window {
    ankkor: {
      enableLaunchingSoon: () => void;
      disableLaunchingSoon: () => void;
      getLaunchingSoonStatus: () => boolean;
    };
  }
}

/**
 * Initialize the launching utilities on the window object
 * This should be called once when the app starts
 */
export const initializeLaunchingUtils = () => {
  if (typeof window !== 'undefined') {
    // Create the ankkor namespace if it doesn't exist
    if (!window.ankkor) {
      window.ankkor = {} as any;
    }

    // Add the utility functions
    window.ankkor.enableLaunchingSoon = () => {
      // Prevent enabling/disabling in production
      if (process.env.NODE_ENV === 'production') {
        console.warn('Changing launch state is disabled in production.');
        return;
      }
      
      localStorage.setItem('ankkor-launch-state', JSON.stringify({ 
        state: { 
          isLaunchingSoon: true
        } 
      }));
      window.location.reload();
    };

    window.ankkor.disableLaunchingSoon = () => {
      // Prevent enabling/disabling in production
      if (process.env.NODE_ENV === 'production') {
        console.warn('Changing launch state is disabled in production.');
        return;
      }
      
      // Get current state
      const currentStateStr = localStorage.getItem('ankkor-launch-state');
      let currentState = { state: {} };
      
      if (currentStateStr) {
        try {
          currentState = JSON.parse(currentStateStr);
        } catch (e) {
          console.error('Failed to parse launch state', e);
        }
      }
      
      // Update only the isLaunchingSoon flag
      localStorage.setItem('ankkor-launch-state', JSON.stringify({
        ...currentState,
        state: {
          ...currentState.state,
          isLaunchingSoon: false
        }
      }));
      
      window.location.reload();
    };

    window.ankkor.getLaunchingSoonStatus = () => {
      const stateStr = localStorage.getItem('ankkor-launch-state');
      if (!stateStr) return true; // Default to true if no state is stored
      
      try {
        const state = JSON.parse(stateStr);
        return !!state.state?.isLaunchingSoon;
      } catch (e) {
        console.error('Failed to parse launch state', e);
        return true;
      }
    };
  }
};

export default initializeLaunchingUtils; 