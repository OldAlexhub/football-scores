import {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import { CONSENT_CONFIG } from '../config/adsConfig';

export interface ConsentOutcome {
  canRequestAds: boolean;
  status: AdsConsentStatus;
}

/**
 * Runs the full Google UMP flow: request updated consent info, show the
 * form only if required, and report whether ads may be requested. Never
 * throws — a failure to reach Google's consent servers must not block the
 * rest of the app from loading, it just means ads stay disabled this
 * session until the next successful check.
 */
export async function requestConsentAndGate(): Promise<ConsentOutcome> {
  try {
    const info = await AdsConsent.requestInfoUpdate({
      debugGeography: __DEV__ && CONSENT_CONFIG.debugTestDeviceIds.length > 0
        ? AdsConsentDebugGeography.EEA
        : AdsConsentDebugGeography.DISABLED,
      testDeviceIdentifiers: CONSENT_CONFIG.debugTestDeviceIds,
      tagForUnderAgeOfConsent: CONSENT_CONFIG.tagForUnderAgeOfConsent,
    });

    if (info.isConsentFormAvailable && info.status === AdsConsentStatus.REQUIRED) {
      const formResult = await AdsConsent.showForm();
      return { canRequestAds: formResult.canRequestAds, status: formResult.status };
    }

    return { canRequestAds: info.canRequestAds, status: info.status };
  } catch {
    // Google documents that UMP keeps the previous session's consent state
    // while a fresh update is in progress (or fails). Preserve that valid
    // state instead of turning a temporary network/update error into a full
    // ad outage. A first install with no valid consent still fails closed.
    const previous = await AdsConsent.getConsentInfo().catch(() => null);
    if (__DEV__ && !previous?.canRequestAds) {
      // Debug builds only use Google's demo units, so keep the ad layout
      // testable even before the publisher creates a production UMP message.
      return { canRequestAds: true, status: previous?.status ?? AdsConsentStatus.UNKNOWN };
    }
    return {
      canRequestAds: previous?.canRequestAds ?? false,
      status: previous?.status ?? AdsConsentStatus.UNKNOWN,
    };
  }
}

export async function openPrivacyOptionsForm(): Promise<ConsentOutcome> {
  try {
    const formResult = await AdsConsent.showPrivacyOptionsForm();
    return { canRequestAds: formResult.canRequestAds, status: formResult.status };
  } catch {
    const info = await AdsConsent.getConsentInfo().catch(() => null);
    return { canRequestAds: info?.canRequestAds ?? false, status: info?.status ?? AdsConsentStatus.UNKNOWN };
  }
}

export async function isPrivacyOptionsFormRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}
