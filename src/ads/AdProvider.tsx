import React, { useEffect } from 'react';
import { initAdLifecycle, onAppForeground } from './AdLifecycleManager';
import { initializeAdsOnce } from './AdService';
import { preloadNext } from './AdPreloadController';
import { startKeyboardVisibilityTracking } from './keyboardVisibility';

let bootstrapped = false;

/**
 * Mount once near the app root. Bootstraps the ad lifecycle, keyboard
 * tracking, and the consent → SDK-init → preload chain exactly one time per
 * process, regardless of how many times this component re-renders.
 */
export function AdProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;
    startKeyboardVisibilityTracking();
    initAdLifecycle();
    void initializeAdsOnce();
    onAppForeground(() => preloadNext());
  }, []);

  return <>{children}</>;
}
