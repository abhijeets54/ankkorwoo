'use client';

import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useLaunchingSoonStore } from '@/components/providers/LaunchingSoonProvider';

/**
 * A wrapper component that conditionally renders the Navbar
 * based on the launching soon state
 */
const NavbarWrapper = () => {
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

  // Don't render the navbar if we're in launching soon mode
  if (isLaunchingSoon) {
    return null;
  }

  // Otherwise, render the navbar
  return <Navbar />;
};

export default NavbarWrapper;