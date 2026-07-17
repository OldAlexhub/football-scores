import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_PREFERENCES, getPreferences, updatePreferences as persistUpdate } from '../storage/preferencesRepo';
import type { UserPreferences } from '../types/domain';
import { changeLanguage } from '../i18n';

interface PreferencesContextValue {
  preferences: UserPreferences;
  update: (patch: Partial<UserPreferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  update: async () => undefined,
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getPreferences());

  const update = async (patch: Partial<UserPreferences>) => {
    const next = persistUpdate(patch);
    setPreferences(next);
    if (patch.language && patch.language !== preferences.language) {
      await changeLanguage(patch.language);
    }
  };

  return (
    <PreferencesContext.Provider value={{ preferences, update }}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}
