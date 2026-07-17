import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { FREQUENCY_CAPS, INTERSTITIAL_AD_UNIT_ID } from '../config/adsConfig';
import { getAdsInitState, subscribeAdsInitState } from './AdService';

type LoadState = 'idle' | 'loading' | 'loaded' | 'failed';

let interstitial: InterstitialAd | null = null;
let loadState: LoadState = 'idle';
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let showInFlight = false;

function createInterstitial(): InterstitialAd {
  const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    loadState = 'loaded';
    retryAttempt = 0;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    loadState = 'failed';
    scheduleRetry();
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    interstitial = null;
    loadState = 'idle';
    showInFlight = false;
    preloadNext();
  });
  return ad;
}

function scheduleRetry(): void {
  const backoff = FREQUENCY_CAPS.interstitialPreloadRetryBackoffSeconds;
  const delaySec = backoff[Math.min(retryAttempt, backoff.length - 1)];
  retryAttempt += 1;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => preloadNext(), delaySec * 1000);
}

export function preloadNext(): void {
  if (getAdsInitState() !== 'ready') return;
  if (interstitial && (loadState === 'loading' || loadState === 'loaded')) return;
  interstitial = createInterstitial();
  loadState = 'loading';
  interstitial.load();
}

subscribeAdsInitState(next => {
  if (next === 'ready') {
    preloadNext();
  }
});

export function isInterstitialLoaded(): boolean {
  return loadState === 'loaded' && !!interstitial;
}

/**
 * Shows the currently preloaded interstitial, if any, and resolves once it
 * has been dismissed (or immediately if none is loaded / one is already in
 * flight). The next interstitial begins preloading only after this one
 * closes, never immediately after — Google's own guidance against
 * back-to-back interstitial requests.
 */
export function presentPreloadedInterstitial(): Promise<'shown' | 'not_ready' | 'already_showing'> {
  return new Promise(resolve => {
    if (showInFlight) {
      resolve('already_showing');
      return;
    }
    if (!isInterstitialLoaded() || !interstitial) {
      resolve('not_ready');
      return;
    }
    showInFlight = true;
    const ad = interstitial;
    const unsubscribe = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribe();
      resolve('shown');
    });
    ad.show().catch(() => {
      showInFlight = false;
      interstitial = null;
      loadState = 'idle';
      resolve('not_ready');
    });
  });
}
