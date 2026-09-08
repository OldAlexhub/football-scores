import { buildRange, clampRange, eachDay, isSingleDay } from '../src/utils/dateRange';
import { endOfLocalDay, startOfLocalDay, toLocalDateKey } from '../src/utils/dates';

const MONDAY = new Date(2026, 8, 7, 10, 0, 0); // Mon 7 Sep 2026, local

describe('buildRange', () => {
  it('today is a single local day', () => {
    const { start, end } = buildRange('today', MONDAY);
    expect(isSingleDay(start.toISOString(), end.toISOString())).toBe(true);
  });

  it('next7 spans exactly 7 calendar days', () => {
    const { start, end } = buildRange('next7', MONDAY);
    expect(eachDay(start, end)).toHaveLength(7);
  });

  it('next14 spans exactly 14 calendar days', () => {
    const { start, end } = buildRange('next14', MONDAY);
    expect(eachDay(start, end)).toHaveLength(14);
  });

  it('weekend is Friday through Sunday', () => {
    const { start, end } = buildRange('weekend', MONDAY);
    expect(start.getDay()).toBe(5);
    expect(end.getDay()).toBe(0);
    expect(eachDay(start, end)).toHaveLength(3);
  });
});

describe('clampRange', () => {
  it('swaps an inverted selection', () => {
    const a = new Date(2026, 8, 20);
    const b = new Date(2026, 8, 10);
    const { start, end } = clampRange(a, b, 31);
    expect(start.getTime()).toBeLessThan(end.getTime());
    expect(toLocalDateKey(start.toISOString())).toBe('2026-09-10');
  });

  it('caps the span at maxDays', () => {
    const { start, end } = clampRange(new Date(2026, 0, 1), new Date(2026, 11, 31), 31);
    expect(eachDay(start, end)).toHaveLength(31);
  });
});

describe('isSingleDay', () => {
  it('is true for the local-day boundaries the Matches screen passes', () => {
    const day = new Date(2026, 8, 8, 15, 0, 0);
    expect(isSingleDay(startOfLocalDay(day).toISOString(), endOfLocalDay(day).toISOString())).toBe(true);
  });

  it('is false across two different local days', () => {
    const a = startOfLocalDay(new Date(2026, 8, 8));
    const b = endOfLocalDay(new Date(2026, 8, 10));
    expect(isSingleDay(a.toISOString(), b.toISOString())).toBe(false);
  });
});
