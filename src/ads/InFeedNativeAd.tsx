import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import {
  BANNER_AD_UNIT_ID,
  FREQUENCY_CAPS,
  NATIVE_ADS_ENABLED,
  NATIVE_AD_UNIT_ID,
} from '../config/adsConfig';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon } from '../components/AppIcon';
import { getAdsInitState, subscribeAdsInitState } from './AdService';

export function InFeedNativeAd({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [adsReady, setAdsReady] = useState(getAdsInitState() === 'ready');
  const [bannerFailed, setBannerFailed] = useState(false);
  const [bannerAttempt, setBannerAttempt] = useState(0);

  useEffect(() => subscribeAdsInitState(state => setAdsReady(state === 'ready')), []);

  useEffect(() => {
    if (!bannerFailed) return;
    const delays = FREQUENCY_CAPS.bannerRetryBackoffSeconds;
    const delay = delays[Math.min(bannerAttempt, delays.length - 1)] * 1000;
    const timer = setTimeout(() => {
      setBannerFailed(false);
      setBannerAttempt(value => value + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [bannerAttempt, bannerFailed]);

  useEffect(() => {
    if (!NATIVE_ADS_ENABLED || !adsReady) return;
    let mounted = true;
    let loadedAd: NativeAd | null = null;
    const load = async () => {
      try {
        const ad = await NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID, {
          aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
          startVideoMuted: true,
        });
        if (!mounted) {
          ad.destroy();
          return;
        }
        loadedAd = ad;
        setNativeAd(ad);
      } catch {
        // Empty ad slots collapse without disturbing content.
      }
    };
    void load();
    return () => {
      mounted = false;
      loadedAd?.destroy();
    };
  }, [adsReady]);

  if (!adsReady) return null;

  // Until a dedicated production native unit is created, keep this valuable
  // in-feed placement monetized with an inline adaptive banner. Debug still
  // exercises the richer native implementation with Google's test unit.
  if (!NATIVE_ADS_ENABLED) {
    if (bannerFailed) return null;
    return (
      <View
        style={[
          styles.inlineBanner,
          { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
        ]}
      >
        <BannerAd
          key={`inline-banner-${bannerAttempt}`}
          unitId={BANNER_AD_UNIT_ID}
          size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdFailedToLoad={() => setBannerFailed(true)}
        />
      </View>
    );
  }

  if (!nativeAd) return null;

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[
        styles.card,
        compact && styles.compactCard,
        { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.adHeader}>
        <Text style={[styles.adBadge, { color: theme.colors.accent, borderColor: theme.colors.accent }]}>Ad</Text>
        <Text style={[styles.sponsored, { color: theme.colors.textMuted }]}>Sponsored</Text>
      </View>
      {!compact && nativeAd.mediaContent ? <NativeMediaView style={styles.media} resizeMode="cover" /> : null}
      <View style={styles.contentRow}>
        {nativeAd.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : (
          <View style={[styles.icon, styles.iconFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
            <AppIcon name="spark" size={20} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.copy}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={[styles.headline, { color: theme.colors.textPrimary }]} numberOfLines={2}>{nativeAd.headline}</Text>
          </NativeAsset>
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={[styles.advertiser, { color: theme.colors.textMuted }]} numberOfLines={1}>{nativeAd.advertiser}</Text>
            </NativeAsset>
          ) : null}
        </View>
      </View>
      {!compact && nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={[styles.body, { color: theme.colors.textSecondary }]} numberOfLines={2}>{nativeAd.body}</Text>
        </NativeAsset>
      ) : null}
      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
        <Text style={[styles.cta, { color: theme.colors.accentText, backgroundColor: theme.colors.accent }]}>{nativeAd.callToAction}</Text>
      </NativeAsset>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  inlineBanner: { minHeight: 50, marginBottom: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  card: { marginBottom: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
  compactCard: { padding: 12 },
  adHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  adBadge: { minWidth: 21, height: 18, borderWidth: 1, borderRadius: 4, textAlign: 'center', fontSize: 9, fontWeight: '900', textAlignVertical: 'center' },
  sponsored: { fontSize: 9, fontWeight: '700' },
  media: { width: '100%', height: 130, borderRadius: 12, marginBottom: 10 },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 42, height: 42, borderRadius: 10 },
  iconFallback: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  headline: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  advertiser: { fontSize: 10, marginTop: 2 },
  body: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  cta: { minHeight: 38, borderRadius: 11, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', paddingHorizontal: 14, fontSize: 12, fontWeight: '900', marginTop: 10 },
});
