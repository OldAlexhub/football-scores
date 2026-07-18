import React, { useEffect } from 'react';
import { initAdLifecycle, onAppForeground } from './AdLifecycleManager';
import { initializeAdsOnce, retryAdsInitializationIfNeeded } from './AdService';
import { preloadNext } from './AdPreloadController';
import { startKeyboardVisibilityTracking } from './keyboardVisibility';
import { maybeShowAppOpen, preloadAppOpen } from './AppOpenAdManager';
import { subscribeAdsInitState } from './AdService';

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
    const unsubscribeReady = subscribeAdsInitState(state => {
      if (state === 'ready') preloadAppOpen();
    });
    const unsubscribeForeground = onAppForeground(isNewSession => {
      void retryAdsInitializationIfNeeded();
      preloadNext();
      if (isNewSession) void maybeShowAppOpen();
    });
    return () => {
      unsubscribeReady();
      unsubscribeForeground();
    };
  }, []);

  return <>{children}</>;
}
