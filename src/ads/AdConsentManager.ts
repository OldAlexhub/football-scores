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
    return { canRequestAds: false, status: AdsConsentStatus.UNKNOWN };
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
