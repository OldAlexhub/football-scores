import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, useForeground } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID, FREQUENCY_CAPS } from '../config/adsConfig';
import { getAdFrequencyState, updateAdFrequencyState } from '../storage/adStateRepo';
import { useTheme } from '../theme/ThemeProvider';
import { getAdsInitState, subscribeAdsInitState } from './AdService';
import { bannerEligibilityController } from './BannerEligibilityController';
import { isAppForeground, onAppBackground, onAppForeground } from './AdLifecycleManager';

type BannerState = 'idle' | 'loading' | 'loaded' | 'failed';

/**
 * The one persistent banner slot in the app, mounted inside the custom
 * bottom tab bar so it survives tab switches without re-requesting an ad.
 * Hides itself on any screen that registers with BannerEligibilityController,
 * while the keyboard is visible, or while the app is backgrounded.
 */
export function SafeAdContainer() {
  const theme = useTheme();
  const [suppressed, setSuppressed] = useState(bannerEligibilityController.isHidden());
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [foreground, setForeground] = useState(isAppForeground());
  const [bannerState, setBannerState] = useState<BannerState>('idle');
  const [adsReady, setAdsReady] = useState(getAdsInitState() === 'ready');
  const retryAttempt = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedAt = useRef<number | null>(null);

  useEffect(() => bannerEligibilityController.subscribe(setSuppressed), []);
  useEffect(() => subscribeAdsInitState(next => setAdsReady(next === 'ready')), []);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  useEffect(() => {
    const unsubFg = onAppForeground(() => setForeground(true));
    const unsubBg = onAppBackground(() => setForeground(false));
    return () => {
      unsubFg();
      unsubBg();
    };
  }, []);

  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  const shouldRender = adsReady && !suppressed && !keyboardVisible && foreground && bannerState !== 'failed';
  const shouldRequest = adsReady && !suppressed && !keyboardVisible && foreground;

  if (!shouldRequest) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingBottom: 0 },
      ]}
    >
      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} pointerEvents="none" />
      {shouldRender ? (
        <View style={styles.bannerWrap}>
          <BannerAd
            unitId={BANNER_AD_UNIT_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: false }}
            onAdLoaded={() => {
              retryAttempt.current = 0;
              loadedAt.current = Date.now();
              setBannerState('loaded');
              const freq = getAdFrequencyState();
              updateAdFrequencyState({ ...freq, bannerLastImpressionAt: new Date().toISOString() });
            }}
            onAdFailedToLoad={() => {
              setBannerState('failed');
              const backoffList = FREQUENCY_CAPS.bannerRetryBackoffSeconds;
              const delaySec = backoffList[Math.min(retryAttempt.current, backoffList.length - 1)];
              retryAttempt.current += 1;
              if (retryTimer.current) clearTimeout(retryTimer.current);
              retryTimer.current = setTimeout(() => setBannerState('idle'), delaySec * 1000);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

export function useForegroundBannerRefresh(onForeground: () => void) {
  useForeground(onForeground);
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  bannerWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
