'use client';

import React from 'react';
import { useLaunchingSoon } from './providers/LaunchingSoonProvider';
import LaunchingSoon from './LaunchingSoon';

export default function LaunchingSoonOverlay() {
  const { isLaunchingSoon } = useLaunchingSoon();

  if (!isLaunchingSoon) {
    return null;
  }

  return <LaunchingSoon />;
}