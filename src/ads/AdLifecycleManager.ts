import { AppState, type AppStateStatus } from 'react-native';
import { getAdSessionState, saveAdSessionState, updateAdFrequencyState, getAdFrequencyState } from '../storage/adStateRepo';
import { generateId } from '../utils/id';

const SESSION_GAP_MS = 30 * 60 * 1000;

let currentAppState: AppStateStatus = AppState.currentState;
const foregroundListeners = new Set<(isNewSession: boolean) => void>();
const backgroundListeners = new Set<() => void>();

export function isAppForeground(): boolean {
  return currentAppState === 'active';
}

export function onAppForeground(listener: (isNewSession: boolean) => void): () => void {
  foregroundListeners.add(listener);
  return () => foregroundListeners.delete(listener);
}

export function onAppBackground(listener: () => void): () => void {
  backgroundListeners.add(listener);
  return () => backgroundListeners.delete(listener);
}

/**
 * Determines whether this is a genuinely new session (app was backgrounded
 * long enough) versus a brief interruption, and resets the rolling counters
 * that gate interstitial frequency accordingly.
 */
export function ensureSession(): boolean {
  const session = getAdSessionState();
  const freq = getAdFrequencyState();
  const now = Date.now();
  const gapMs = now - new Date(session.lastForegroundAtUtc).getTime();
  const isNewSession = !freq.activeSessionStartedAt || gapMs > SESSION_GAP_MS;

  if (isNewSession) {
    saveAdSessionState({
      sessionId: generateId(),
      startedAtUtc: new Date().toISOString(),
      lastForegroundAtUtc: new Date().toISOString(),
    });
    updateAdFrequencyState({
      activeSessionStartedAt: new Date().toISOString(),
      activeSessionInterstitialCount: 0,
      firstSessionStartedAt: freq.firstSessionStartedAt ?? new Date().toISOString(),
      appSessionCount: (freq.appSessionCount ?? 0) + 1,
    });
  } else {
    saveAdSessionState({ ...session, lastForegroundAtUtc: new Date().toISOString() });
  }
  return isNewSession;
}

export function initAdLifecycle(): void {
  ensureSession();
  AppState.addEventListener('change', next => {
    const previous = currentAppState;
    currentAppState = next;
    if (previous !== 'active' && next === 'active') {
      const isNewSession = ensureSession();
      foregroundListeners.forEach(l => l(isNewSession));
    }
    if (previous === 'active' && next !== 'active') {
      backgroundListeners.forEach(l => l());
    }
  });
}
