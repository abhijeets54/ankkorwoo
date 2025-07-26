'use client';

import React from 'react';
import Navbar from './Navbar';
import { useLaunchingSoonStore } from '@/components/providers/LaunchingSoonProvider';

/**
 * A wrapper component that conditionally renders the Navbar
 * based on the launching soon state
 */
const NavbarWrapper = () => {
  // Get the launching soon state
  const { isLaunchingSoon } = useLaunchingSoonStore();
  
  // Don't render the navbar if we're in launching soon mode
  if (isLaunchingSoon) {
    return null;
  }
  
  // Otherwise, render the navbar
  return <Navbar />;
};

export default NavbarWrapper; 