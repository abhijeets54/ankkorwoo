'use client';

import React, { useState, useEffect } from 'react';
import Footer from './Footer';
import { useLaunchingSoonStore } from '@/components/providers/LaunchingSoonProvider';

/**
 * A wrapper component that conditionally renders the Footer
 * based on the launching soon state
 */
const FooterWrapper = () => {
  // Handle hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  const { isLaunchingSoon } = useLaunchingSoonStore();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // During SSR and initial hydration, don't render anything to prevent mismatch
  if (!isHydrated) {
    return null;
  }

  // Don't render the footer if we're in launching soon mode
  if (isLaunchingSoon) {
    return null;
  }

  // Otherwise, render the footer
  return <Footer />;
};

export default FooterWrapper;