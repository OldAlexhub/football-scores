import { addDays, endOfLocalDay, startOfLocalDay, toLocalDateKey, upcomingWeekendRange } from './dates';

export type DateRangePreset = 'today' | 'weekend' | 'next7' | 'next14';

export interface DateRange {
  start: Date;
  end: Date;
}

/** Build a concrete [start, end] range for a named preset. */
export function buildRange(preset: DateRangePreset, today: Date = new Date()): DateRange {
  switch (preset) {
    case 'weekend':
      return upcomingWeekendRange(today);
    case 'next7':
      return { start: startOfLocalDay(today), end: endOfLocalDay(addDays(today, 6)) };
    case 'next14':
      return { start: startOfLocalDay(today), end: endOfLocalDay(addDays(today, 13)) };
    case 'today':
    default:
      return { start: startOfLocalDay(today), end: endOfLocalDay(today) };
  }
}

/** Normalise a user-picked range: swap if inverted, cap the span at `maxDays`. */
export function clampRange(start: Date, end: Date, maxDays: number): DateRange {
  let lo = startOfLocalDay(start);
  let hi = startOfLocalDay(end);
  if (hi.getTime() < lo.getTime()) {
    const tmp = lo;
    lo = hi;
    hi = tmp;
  }
  const maxHi = startOfLocalDay(addDays(lo, Math.max(0, maxDays - 1)));
  if (hi.getTime() > maxHi.getTime()) hi = maxHi;
  return { start: lo, end: endOfLocalDay(hi) };
}

export function isSingleDay(fromUtc: string, toUtc: string): boolean {
  return toLocalDateKey(fromUtc) === toLocalDateKey(toUtc);
}

/** Every calendar day (at local midnight) covered by [from, to], inclusive. */
export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfLocalDay(from);
  const last = startOfLocalDay(to);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}
