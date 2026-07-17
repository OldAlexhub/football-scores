/**
 * Central AdMob configuration. Production ad unit IDs are exact values
 * supplied for Football Scores Today and must never be edited. Debug builds
 * always use Google's official test ad units so no developer device can ever
 * request or accidentally click a production ad.
 */
import { NativeModules, Platform } from 'react-native';

export const ADMOB_APPLICATION_ID = 'ca-app-pub-7831002909037560~7761656669';

const PRODUCTION_BANNER_ID = 'ca-app-pub-7831002909037560/5490596409';
const PRODUCTION_INTERSTITIAL_ID = 'ca-app-pub-7831002909037560/8033119406';

const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/9214589741';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

const APP_ID_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;
const AD_UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;
const GOOGLE_TEST_PUBLISHER = 'ca-app-pub-3940256099942544';

function assertValidAppId(id: string): void {
  if (!APP_ID_PATTERN.test(id)) {
    throw new Error(`adsConfig: malformed AdMob application id "${id}"`);
  }
}

function assertValidAdUnitId(id: string, label: string): void {
  if (!AD_UNIT_ID_PATTERN.test(id)) {
    throw new Error(`adsConfig: malformed ${label} ad unit id "${id}"`);
  }
}

assertValidAppId(ADMOB_APPLICATION_ID);
assertValidAdUnitId(PRODUCTION_BANNER_ID, 'production banner');
assertValidAdUnitId(PRODUCTION_INTERSTITIAL_ID, 'production interstitial');
assertValidAdUnitId(TEST_BANNER_ID, 'test banner');
assertValidAdUnitId(TEST_INTERSTITIAL_ID, 'test interstitial');

if (!__DEV__) {
  // Release build safety net: fail loudly rather than silently serve Google's
  // test units (near-zero revenue) or, worse, request production units from
  // a developer's own device during QA.
  if (PRODUCTION_BANNER_ID.startsWith(GOOGLE_TEST_PUBLISHER)) {
    throw new Error('adsConfig: release build is using a Google test banner id');
  }
  if (PRODUCTION_INTERSTITIAL_ID.startsWith(GOOGLE_TEST_PUBLISHER)) {
    throw new Error('adsConfig: release build is using a Google test interstitial id');
  }
}

export const BANNER_AD_UNIT_ID = __DEV__ ? TEST_BANNER_ID : PRODUCTION_BANNER_ID;
export const INTERSTITIAL_AD_UNIT_ID = __DEV__ ? TEST_INTERSTITIAL_ID : PRODUCTION_INTERSTITIAL_ID;

export const AD_PLACEMENT_NAMES = [
  'weekend_planner_done',
  'weekend_planner_share',
  'prediction_save_milestone',
  'prediction_export',
  'backup_export',
  'prediction_stats_card',
  'table_scenario_saved',
  'reminder_batch_done',
  'ics_export_done',
] as const;

export const FREQUENCY_CAPS = {
  minSecondsSinceSessionStart: 180,
  minEligibleActionsBeforeFirstInterstitial: 4,
  minEligibleActionsBetweenInterstitials: 3,
  minSecondsBetweenInterstitials: 8 * 60,
  maxInterstitialsPerSession: 2,
  maxInterstitialsPerRollingDay: 5,
  bannerMinDisplaySeconds: 60,
  bannerRetryBackoffSeconds: [5, 15, 45, 120, 300],
  interstitialPreloadRetryBackoffSeconds: [10, 30, 90],
} as const;

export const CONSENT_CONFIG = {
  // Debug test device IDs let the UMP SDK show the EEA consent form on
  // developer devices without spoofing geography in release builds.
  debugTestDeviceIds: Platform.select<string[]>({ android: [], default: [] }) ?? [],
  tagForUnderAgeOfConsent: false,
};

export const ADS_ENABLED = true;

export function isAdsDiagnosticsEnabled(): boolean {
  return __DEV__;
}

export function getNativeWidgetBridge(): {
  updateWidgetSnapshot: (json: string) => Promise<boolean>;
  clearWidgetSnapshot: () => Promise<boolean>;
} | null {
  const mod = NativeModules.WidgetBridge;
  return mod ?? null;
}
