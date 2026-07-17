import { adStateStorage, getJson, setJson } from './mmkvStorage';
import { generateId } from '../utils/id';
import type {
  AdFrequencyState,
  AdPlacementName,
  AdPlacementState,
  AdSessionState,
} from '../types/domain';

const FREQUENCY_KEY = 'ad_frequency_state';
const SESSION_KEY = 'ad_session_state';
const PLACEMENT_KEY_PREFIX = 'ad_placement_state_';

export const DEFAULT_AD_FREQUENCY_STATE: AdFrequencyState = {
  lastInterstitialAt: null,
  firstSessionStartedAt: null,
  activeSessionStartedAt: null,
  activeSessionInterstitialCount: 0,
  rollingDayInterstitialCount: 0,
  rollingDayStartedAt: null,
  eligibleActionCount: 0,
  lastEligibleActionType: null,
  bannerLastRequestedAt: null,
  bannerLastImpressionAt: null,
};

export function getAdFrequencyState(): AdFrequencyState {
  return getJson(adStateStorage, FREQUENCY_KEY, DEFAULT_AD_FREQUENCY_STATE);
}

export function saveAdFrequencyState(state: AdFrequencyState): void {
  setJson(adStateStorage, FREQUENCY_KEY, state);
}

export function updateAdFrequencyState(patch: Partial<AdFrequencyState>): AdFrequencyState {
  const next = { ...getAdFrequencyState(), ...patch };
  saveAdFrequencyState(next);
  return next;
}

export function getAdSessionState(): AdSessionState {
  return getJson(adStateStorage, SESSION_KEY, {
    sessionId: generateId(),
    startedAtUtc: new Date().toISOString(),
    lastForegroundAtUtc: new Date().toISOString(),
  });
}

export function saveAdSessionState(state: AdSessionState): void {
  setJson(adStateStorage, SESSION_KEY, state);
}

export function getAdPlacementState(placement: AdPlacementName): AdPlacementState {
  return getJson(adStateStorage, `${PLACEMENT_KEY_PREFIX}${placement}`, {
    placement,
    lastShownAt: null,
    timesShown: 0,
  });
}

export function recordAdPlacementShown(placement: AdPlacementName): void {
  const current = getAdPlacementState(placement);
  setJson(adStateStorage, `${PLACEMENT_KEY_PREFIX}${placement}`, {
    placement,
    lastShownAt: new Date().toISOString(),
    timesShown: current.timesShown + 1,
  });
}
