import { FREQUENCY_CAPS } from '../config/adsConfig';
import { getAdFrequencyState, getAdSessionState, updateAdFrequencyState } from '../storage/adStateRepo';
import type { AdPlacementName } from '../types/domain';

function rollingDayHasElapsed(startedAtIso: string | null): boolean {
  if (!startedAtIso) return true;
  return Date.now() - new Date(startedAtIso).getTime() >= 24 * 60 * 60 * 1000;
}

/**
 * Pure decision function: given the persisted frequency state and the
 * placement that just completed, may an interstitial be shown right now?
 * Every rule in section 25 of the product spec is enforced here so the
 * eligibility logic lives in exactly one place.
 */
export function canShowInterstitial(placement: AdPlacementName): boolean {
  const freq = getAdFrequencyState();
  const session = getAdSessionState();
  const now = Date.now();

  const sessionStart = new Date(freq.activeSessionStartedAt ?? session.startedAtUtc).getTime();
  if (now - sessionStart < FREQUENCY_CAPS.minSecondsSinceSessionStart * 1000) {
    return false;
  }

  if (freq.eligibleActionCount < FREQUENCY_CAPS.minEligibleActionsBeforeFirstInterstitial) {
    return false;
  }

  if (!freq.lastInterstitialAt) {
    // First interstitial of all time already covered by the two checks above.
  } else {
    const sinceLast = now - new Date(freq.lastInterstitialAt).getTime();
    if (sinceLast < FREQUENCY_CAPS.minSecondsBetweenInterstitials * 1000) {
      return false;
    }
    if (freq.eligibleActionCount < FREQUENCY_CAPS.minEligibleActionsBetweenInterstitials) {
      return false;
    }
    if (freq.lastEligibleActionType === placement) {
      return false;
    }
  }

  if (freq.activeSessionInterstitialCount >= FREQUENCY_CAPS.maxInterstitialsPerSession) {
    return false;
  }

  const dayCount = rollingDayHasElapsed(freq.rollingDayStartedAt) ? 0 : freq.rollingDayInterstitialCount;
  if (dayCount >= FREQUENCY_CAPS.maxInterstitialsPerRollingDay) {
    return false;
  }

  return true;
}

/** Called once per completed eligible user action, whether or not an ad is shown. */
export function recordEligibleAction(placement: AdPlacementName): void {
  const freq = getAdFrequencyState();
  updateAdFrequencyState({
    eligibleActionCount: freq.eligibleActionCount + 1,
    lastEligibleActionType: placement,
  });
}

/** Called only when an interstitial actually displayed — resets the between-ads counter. */
export function recordInterstitialShown(): void {
  const freq = getAdFrequencyState();
  const dayReset = rollingDayHasElapsed(freq.rollingDayStartedAt);
  updateAdFrequencyState({
    lastInterstitialAt: new Date().toISOString(),
    activeSessionInterstitialCount: freq.activeSessionInterstitialCount + 1,
    rollingDayInterstitialCount: dayReset ? 1 : freq.rollingDayInterstitialCount + 1,
    rollingDayStartedAt: dayReset ? new Date().toISOString() : freq.rollingDayStartedAt ?? new Date().toISOString(),
    eligibleActionCount: 0,
  });
}
