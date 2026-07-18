import { useEffect } from 'react';
import { fetchMatches } from '../providers/providerManager';
import { pushWidgetSnapshot } from '../services/widgetBridge';
import { addDays } from '../utils/dates';
import { useFavorites } from './FavoritesContext';
import { usePreferences } from './PreferencesContext';
import { useReminders } from './RemindersContext';
import { useWatchPlan } from './WatchPlanContext';
import type { LanguagePreference, Reminder, WatchPlanItem } from '../types/domain';

interface WidgetSyncInput {
  favoriteTeamIds: Set<string>;
  watchPlanItems: WatchPlanItem[];
  reminders: Reminder[];
  language: LanguagePreference;
}

export async function syncWidgetSnapshotNow(input: WidgetSyncInput): Promise<void> {
  const result = await fetchMatches({
    dateFromUtc: new Date().toISOString(),
    dateToUtc: addDays(new Date(), 10).toISOString(),
  });
  await pushWidgetSnapshot({
    matches: result.data,
    favoriteTeamIds: input.favoriteTeamIds,
    watchPlanItems: input.watchPlanItems,
    reminders: input.reminders,
    language: input.language,
  });
}

/** Mounted once near the app root — keeps the Android home-screen widget in sync. */
export function WidgetSyncEffect() {
  const { favoriteTeamIds, loading: favoritesLoading } = useFavorites();
  const { items } = useWatchPlan();
  const { reminders } = useReminders();
  const { preferences } = usePreferences();

  useEffect(() => {
    if (favoritesLoading) return;
    let cancelled = false;
    syncWidgetSnapshotNow({
      favoriteTeamIds,
      watchPlanItems: items,
      reminders,
      language: preferences.language,
    }).then(() => {
      if (cancelled) return;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesLoading, favoriteTeamIds.size, items.length, reminders.length, preferences.language]);

  return null;
}
