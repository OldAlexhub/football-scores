import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { ADS_ENABLED } from '../config/adsConfig';
import { requestConsentAndGate } from './AdConsentManager';

export type AdsInitState = 'idle' | 'initializing' | 'ready' | 'blocked' | 'failed';

let state: AdsInitState = 'idle';
let initPromise: Promise<AdsInitState> | null = null;
const listeners = new Set<(state: AdsInitState) => void>();

function setState(next: AdsInitState): void {
  state = next;
  listeners.forEach(l => l(next));
}

export function getAdsInitState(): AdsInitState {
  return state;
}

export function subscribeAdsInitState(listener: (state: AdsInitState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/**
 * Runs exactly once per app process: consent → SDK configuration → SDK
 * initialize. Ads (banner or interstitial) must never be requested before
 * this resolves to 'ready'.
 */
export async function initializeAdsOnce(): Promise<AdsInitState> {
  if (initPromise) {
    return initPromise;
  }
  if (!ADS_ENABLED) {
    setState('blocked');
    return 'blocked';
  }

  initPromise = (async () => {
    setState('initializing');
    try {
      const consent = await requestConsentAndGate();
      if (!consent.canRequestAds) {
        setState('blocked');
        return 'blocked' as const;
      }

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await mobileAds().initialize();
      setState('ready');
      return 'ready' as const;
    } catch {
      setState('failed');
      return 'failed' as const;
    }
  })();

  return initPromise;
}
