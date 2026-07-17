import { AdEventType, AppOpenAd } from 'react-native-google-mobile-ads';
import { APP_OPEN_ADS_ENABLED, APP_OPEN_AD_UNIT_ID, FREQUENCY_CAPS } from '../config/adsConfig';
import { getAdFrequencyState, updateAdFrequencyState } from '../storage/adStateRepo';
import { bannerEligibilityController } from './BannerEligibilityController';
import { getAdsInitState } from './AdService';
import { isKeyboardVisible } from './keyboardVisibility';

const MAX_AD_AGE_MS = 4 * 60 * 60 * 1000;
let ad: AppOpenAd | null = null;
let loadedAt = 0;
let loading = false;
let showing = false;

export function preloadAppOpen(): void {
  if (!APP_OPEN_ADS_ENABLED || getAdsInitState() !== 'ready' || loading || showing) return;
  if (ad && Date.now() - loadedAt < MAX_AD_AGE_MS) return;
  ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID, { requestNonPersonalizedAdsOnly: false });
  loading = true;
  ad.addAdEventListener(AdEventType.LOADED, () => {
    loading = false;
    loadedAt = Date.now();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    loading = false;
    ad = null;
  });
  ad.addAdEventListener(AdEventType.OPENED, () => {
    showing = true;
    updateAdFrequencyState({ lastAppOpenAdAt: new Date().toISOString() });
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    showing = false;
    ad = null;
    loadedAt = 0;
    preloadAppOpen();
  });
  ad.load();
}

export async function maybeShowAppOpen(): Promise<void> {
  if (!APP_OPEN_ADS_ENABLED || !ad || loading || showing || Date.now() - loadedAt >= MAX_AD_AGE_MS) {
    preloadAppOpen();
    return;
  }
  const state = getAdFrequencyState();
  if ((state.appSessionCount ?? 0) < FREQUENCY_CAPS.minSessionsBeforeAppOpen) return;
  if (state.lastAppOpenAdAt) {
    const secondsSinceLast = (Date.now() - new Date(state.lastAppOpenAdAt).getTime()) / 1000;
    if (secondsSinceLast < FREQUENCY_CAPS.minSecondsBetweenAppOpenAds) return;
  }
  if (bannerEligibilityController.isHidden() || isKeyboardVisible() || getAdsInitState() !== 'ready') return;
  await ad.show().catch(() => {
    showing = false;
    ad = null;
    preloadAppOpen();
  });
}
