import { normalizeDefaultTab } from '../navigation/defaultTab';
import { getJson, preferencesStorage, setJson } from './mmkvStorage';
import type { UserPreferences } from '../types/domain';

const KEY = 'user_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  onboardingCompleted: false,
  language: 'en',
  theme: 'system',
  dataDisclosureVersion: 0,
  favoriteTeamReminders: false,
  clock: '24h',
  defaultReminderOffsetMinutes: 15,
  defaultSpoilerShieldEnabled: false,
  defaultOpeningTab: 'home',
  showCompletedMatches: true,
  notificationsEnabled: false,
};

export function getPreferences(): UserPreferences {
  const stored = getJson(preferencesStorage, KEY, DEFAULT_PREFERENCES);
  // Coerce a legacy opening-tab value from an earlier build.
  return { ...DEFAULT_PREFERENCES, ...stored, defaultOpeningTab: normalizeDefaultTab(stored.defaultOpeningTab) };
}

export function savePreferences(preferences: UserPreferences): void {
  setJson(preferencesStorage, KEY, preferences);
}

export function updatePreferences(patch: Partial<UserPreferences>): UserPreferences {
  const next = { ...getPreferences(), ...patch };
  savePreferences(next);
  return next;
}

export function resetPreferences(): void {
  preferencesStorage.delete(KEY);
}
