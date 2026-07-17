import type { AdPlacementName } from '../types/domain';
import { canShowInterstitial } from './AdFrequencyController';
import { isInterstitialLoaded } from './AdPreloadController';
import { bannerEligibilityController } from './BannerEligibilityController';
import { getAdsInitState } from './AdService';
import { isKeyboardVisible } from './keyboardVisibility';

/**
 * Final gate before ever calling presentPreloadedInterstitial(): combines
 * frequency-cap eligibility, ad readiness, SDK init state, and "is the user
 * currently in a sensitive workflow" (same suppression signal the banner
 * uses — editors, consent forms, permission prompts, keyboard open, …).
 */
export function isInterstitialEligibleNow(placement: AdPlacementName): boolean {
  if (getAdsInitState() !== 'ready') return false;
  if (bannerEligibilityController.isHidden()) return false;
  if (isKeyboardVisible()) return false;
  if (!isInterstitialLoaded()) return false;
  return canShowInterstitial(placement);
}
