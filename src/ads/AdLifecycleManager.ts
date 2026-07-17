import { AppState, type AppStateStatus } from 'react-native';
import { getAdSessionState, saveAdSessionState, updateAdFrequencyState, getAdFrequencyState } from '../storage/adStateRepo';
import { generateId } from '../utils/id';

const SESSION_GAP_MS = 30 * 60 * 1000;

let currentAppState: AppStateStatus = AppState.currentState;
const foregroundListeners = new Set<() => void>();
const backgroundListeners = new Set<() => void>();

export function isAppForeground(): boolean {
  return currentAppState === 'active';
}

export function onAppForeground(listener: () => void): () => void {
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
export function ensureSession(): void {
  const session = getAdSessionState();
  const now = Date.now();
  const gapMs = now - new Date(session.lastForegroundAtUtc).getTime();

  if (gapMs > SESSION_GAP_MS) {
    saveAdSessionState({
      sessionId: generateId(),
      startedAtUtc: new Date().toISOString(),
      lastForegroundAtUtc: new Date().toISOString(),
    });
    const freq = getAdFrequencyState();
    updateAdFrequencyState({
      activeSessionStartedAt: new Date().toISOString(),
      activeSessionInterstitialCount: 0,
      firstSessionStartedAt: freq.firstSessionStartedAt ?? new Date().toISOString(),
    });
  } else {
    saveAdSessionState({ ...session, lastForegroundAtUtc: new Date().toISOString() });
  }
}

export function initAdLifecycle(): void {
  ensureSession();
  AppState.addEventListener('change', next => {
    const previous = currentAppState;
    currentAppState = next;
    if (previous !== 'active' && next === 'active') {
      ensureSession();
      foregroundListeners.forEach(l => l());
    }
    if (previous === 'active' && next !== 'active') {
      backgroundListeners.forEach(l => l());
    }
  });
}
