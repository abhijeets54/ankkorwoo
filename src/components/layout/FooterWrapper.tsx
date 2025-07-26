'use client';

import React from 'react';
import Footer from './Footer';
import { useLaunchingSoonStore } from '@/components/providers/LaunchingSoonProvider';

/**
 * A wrapper component that conditionally renders the Footer
 * based on the launching soon state
 */
const FooterWrapper = () => {
  // Get the launching soon state
  const { isLaunchingSoon } = useLaunchingSoonStore();
  
  // Don't render the footer if we're in launching soon mode
  if (isLaunchingSoon) {
    return null;
  }
  
  // Otherwise, render the footer
  return <Footer />;
};

export default FooterWrapper; 