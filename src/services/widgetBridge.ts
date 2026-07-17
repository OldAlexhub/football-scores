import { getNativeWidgetBridge } from '../config/adsConfig';
import { groupClashes } from './clashDetection';
import type { LanguagePreference, Match, Reminder, WatchPlanItem } from '../types/domain';

export interface WidgetSnapshotInput {
  matches: Match[];
  favoriteTeamIds: Set<string>;
  watchPlanItems: WatchPlanItem[];
  reminders: Reminder[];
  language: LanguagePreference;
}

export async function pushWidgetSnapshot(input: WidgetSnapshotInput): Promise<void> {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return;

  const hasFavorites = input.favoriteTeamIds.size > 0;
  const now = Date.now();

  const relevant = input.matches
    .filter(m => input.favoriteTeamIds.has(m.homeTeamId) || input.favoriteTeamIds.has(m.awayTeamId))
    .filter(m => m.status === 'scheduled' || m.status === 'live' || m.status === 'half_time')
    .filter(m => m.kickoffUnknown || !m.kickoffUtc || new Date(m.kickoffUtc).getTime() >= now - 3 * 60 * 60 * 1000)
    .sort((a, b) => {
      const aTime = a.kickoffUtc ? new Date(a.kickoffUtc).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.kickoffUtc ? new Date(b.kickoffUtc).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  const [next, ...rest] = relevant;

  const toSnapshotMatch = (m: Match) => {
    const planItem = input.watchPlanItems.find(w => w.matchId === m.id);
    const spoilerProtected = !!planItem?.spoilerShieldEnabled && !planItem.spoilerRevealed && m.status === 'finished';
    return {
      id: m.id,
      homeTeam: m.homeTeamName,
      awayTeam: m.awayTeamName,
      kickoffIso: m.kickoffUtc,
      kickoffUnknown: m.kickoffUnknown,
      spoilerProtected,
    };
  };

  let clashWarning = false;
  if (next) {
    const groups = groupClashes(
      relevant.slice(0, 6).map(m => ({
        matchId: m.id,
        kickoffUtc: m.kickoffUtc,
        kickoffUnknown: m.kickoffUnknown,
        estimatedDurationMinutes: 120,
        extraTimePossible: m.extraTimePossible,
        priority: 'normal' as const,
        isFavoriteTeamMatch: true,
        watchLater: false,
      })),
    );
    clashWarning = groups.some(g => g.matchIds.includes(next.id));
  }

  const reminderSet = next
    ? input.reminders.some(r => r.matchId === next.id && r.status === 'scheduled')
    : false;

  const snapshot = {
    hasFavorites,
    nextMatch: next ? toSnapshotMatch(next) : null,
    upcoming: rest.slice(0, 2).map(toSnapshotMatch),
    clashWarning,
    reminderSet,
    generatedAtIso: new Date().toISOString(),
    locale: input.language,
  };

  await bridge.updateWidgetSnapshot(JSON.stringify(snapshot)).catch(() => undefined);
}

export async function clearWidgetSnapshot(): Promise<void> {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return;
  await bridge.clearWidgetSnapshot().catch(() => undefined);
}
