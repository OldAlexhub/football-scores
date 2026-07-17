import { getJson, preferencesStorage, setJson } from './mmkvStorage';
import type { UserPreferences } from '../types/domain';

const KEY = 'user_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  onboardingCompleted: false,
  language: 'en',
  theme: 'system',
  clock: '24h',
  defaultReminderOffsetMinutes: 60,
  defaultSpoilerShieldEnabled: false,
  defaultOpeningTab: 'matchday',
  showCompletedMatches: true,
  notificationsEnabled: false,
};

export function getPreferences(): UserPreferences {
  return getJson(preferencesStorage, KEY, DEFAULT_PREFERENCES);
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
