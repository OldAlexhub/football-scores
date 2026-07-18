import { NativeModules, Platform } from 'react-native';
import { flagForCountry } from '../utils/countryFlags';
import { groupClashes } from './clashDetection';
import type { LanguagePreference, Match, Reminder, WatchPlanItem } from '../types/domain';

export interface WidgetSnapshotInput {
  matches: Match[];
  favoriteTeamIds: Set<string>;
  watchPlanItems: WatchPlanItem[];
  reminders: Reminder[];
  language: LanguagePreference;
}

interface NativeWidgetBridge {
  updateWidgetSnapshot: (json: string) => Promise<boolean>;
  clearWidgetSnapshot: () => Promise<boolean>;
  getWidgetCount: () => Promise<number>;
  isPinningSupported: () => Promise<boolean>;
  requestPinWidget: () => Promise<boolean>;
  refreshWidgets: () => Promise<number>;
}

function getNativeWidgetBridge(): NativeWidgetBridge | null {
  if (Platform.OS !== 'android') return null;
  return NativeModules.WidgetBridge ?? null;
}

export async function pushWidgetSnapshot(input: WidgetSnapshotInput): Promise<void> {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return;

  const now = Date.now();
  const reminderMatchIds = new Set(
    input.reminders.filter(reminder => reminder.status === 'scheduled').map(reminder => reminder.matchId),
  );

  const relevant = input.matches
    .filter(m => m.status === 'scheduled' || m.status === 'live' || m.status === 'half_time')
    .filter(m => m.status === 'live'
      || m.status === 'half_time'
      || m.kickoffUnknown
      || !m.kickoffUtc
      || new Date(m.kickoffUtc).getTime() >= now - 15 * 60 * 1000)
    .sort((a, b) => {
      const priority = (match: Match) => {
        if (match.status === 'live' || match.status === 'half_time') return 0;
        if (reminderMatchIds.has(match.id)) return 1;
        if (input.favoriteTeamIds.has(match.homeTeamId) || input.favoriteTeamIds.has(match.awayTeamId)) return 2;
        return 3;
      };
      const priorityDiff = priority(a) - priority(b);
      if (priorityDiff !== 0) return priorityDiff;
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
      competition: `${flagForCountry(m.country)} ${m.competitionName}`.trim(),
      kickoffIso: m.kickoffUtc,
      kickoffUnknown: m.kickoffUnknown,
      status: m.status,
      statusDetail: m.statusDetail ?? null,
      elapsedMinutes: m.elapsedMinutes ?? null,
      homeScore: m.currentScore?.home ?? m.fullTimeScore?.home ?? null,
      awayScore: m.currentScore?.away ?? m.fullTimeScore?.away ?? null,
      reminderSet: reminderMatchIds.has(m.id),
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
    ? reminderMatchIds.has(next.id)
    : false;

  const snapshot = {
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

export async function getWidgetCount(): Promise<number> {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return 0;
  return bridge.getWidgetCount().catch(() => 0);
}

export async function isWidgetPinningSupported(): Promise<boolean> {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return false;
  return bridge.isPinningSupported().catch(() => false);
}

export async function requestPinWidget(): Promise<boolean> {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return false;
  return bridge.requestPinWidget().catch(() => false);
}

export async function refreshInstalledWidgets(): Promise<number> {
  const bridge = getNativeWidgetBridge();
  if (!bridge) return 0;
  return bridge.refreshWidgets().catch(() => 0);
}
