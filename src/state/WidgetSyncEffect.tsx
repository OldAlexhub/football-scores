import { useEffect } from 'react';
import { fetchMatches } from '../providers/providerManager';
import { pushWidgetSnapshot } from '../services/widgetBridge';
import { addDays } from '../utils/dates';
import { useFavorites } from './FavoritesContext';
import { usePreferences } from './PreferencesContext';
import { useReminders } from './RemindersContext';
import { useWatchPlan } from './WatchPlanContext';

/** Mounted once near the app root — keeps the Android home-screen widget in sync. */
export function WidgetSyncEffect() {
  const { favoriteTeamIds, loading: favoritesLoading } = useFavorites();
  const { items } = useWatchPlan();
  const { reminders } = useReminders();
  const { preferences } = usePreferences();

  useEffect(() => {
    if (favoritesLoading) return;
    let cancelled = false;
    fetchMatches({
      dateFromUtc: new Date().toISOString(),
      dateToUtc: addDays(new Date(), 10).toISOString(),
    }).then(result => {
      if (cancelled) return;
      void pushWidgetSnapshot({
        matches: result.data,
        favoriteTeamIds,
        watchPlanItems: items,
        reminders,
        language: preferences.language,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesLoading, favoriteTeamIds.size, items.length, reminders.length, preferences.language]);

  return null;
}
