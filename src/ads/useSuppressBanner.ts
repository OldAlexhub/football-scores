import { useEffect } from 'react';
import { bannerEligibilityController } from './BannerEligibilityController';

/**
 * Call unconditionally from any screen that must never show the persistent
 * banner while mounted (editors, previews, destructive confirmations,
 * onboarding, consent forms, permission prompts).
 */
export function useSuppressBanner(active = true): void {
  useEffect(() => {
    if (!active) return undefined;
    return bannerEligibilityController.suppress();
  }, [active]);
}
