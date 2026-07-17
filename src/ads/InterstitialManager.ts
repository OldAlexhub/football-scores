import type { AdPlacementName } from '../types/domain';
import { recordEligibleAction, recordInterstitialShown } from './AdFrequencyController';
import { presentPreloadedInterstitial } from './AdPreloadController';
import { isInterstitialEligibleNow } from './InterstitialEligibilityEngine';
import { recordAdPlacementShown } from '../storage/adStateRepo';

/**
 * Call this after the user has already seen the real result of their action
 * (export finished, share sheet closed, plan saved, …) and tapped Done /
 * Continue / Return to App. Never blocks: if no interstitial is eligible or
 * ready, it resolves immediately and the caller continues its navigation.
 */
export async function maybeShowInterstitial(placement: AdPlacementName): Promise<void> {
  recordEligibleAction(placement);

  if (!isInterstitialEligibleNow(placement)) {
    return;
  }

  const result = await presentPreloadedInterstitial();
  if (result === 'shown') {
    recordInterstitialShown();
    recordAdPlacementShown(placement);
  }
}
