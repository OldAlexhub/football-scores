import type { ClockPreference, LanguagePreference } from '../types/domain';

export function formatKickoffTime(
  kickoffUtc: string | null,
  kickoffUnknown: boolean,
  clock: ClockPreference,
  language: LanguagePreference,
  timeNotConfirmedLabel: string,
): string {
  if (kickoffUnknown || !kickoffUtc) {
    return timeNotConfirmedLabel;
  }
  const date = new Date(kickoffUtc);
  const locale = language === 'ar' ? 'ar' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: clock === '12h',
  }).format(date);
}

export function formatKickoffDate(kickoffUtc: string, language: LanguagePreference): string {
  const date = new Date(kickoffUtc);
  const locale = language === 'ar' ? 'ar' : 'en-GB';
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function toLocalDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Returns the Friday–Sunday range containing (or immediately following) today. */
export function upcomingWeekendRange(today: Date = new Date()): { start: Date; end: Date } {
  const day = today.getDay(); // 0 = Sunday, 5 = Friday
  const daysUntilFriday = (5 - day + 7) % 7;
  const friday = addDays(startOfLocalDay(today), daysUntilFriday);
  const sunday = addDays(friday, 2);
  return { start: friday, end: endOfLocalDay(sunday) };
}

export function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function isoNow(): string {
  return new Date().toISOString();
}
