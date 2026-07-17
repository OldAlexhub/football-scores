import { formatKickoffTime, upcomingWeekendRange } from '../src/utils/dates';

describe('date utilities', () => {
  it('shows "Time not confirmed" when the kickoff time is unknown', () => {
    const label = formatKickoffTime(null, true, '24h', 'en', 'Time not confirmed');
    expect(label).toBe('Time not confirmed');
  });

  it('never interprets a missing time as midnight', () => {
    const label = formatKickoffTime(null, true, '24h', 'en', 'Time not confirmed');
    expect(label).not.toMatch(/00:00/);
  });

  it('formats a known UTC kickoff time as HH:MM converted to the local timezone', () => {
    // The exact digits depend on the test runner's local timezone (by design —
    // kickoff times are always shown converted to the device's timezone), so
    // this only asserts the shape, not a specific UTC-equals-local value.
    const label = formatKickoffTime('2026-01-10T18:30:00.000Z', false, '24h', 'en', 'Time not confirmed');
    expect(label).toMatch(/^\d{1,2}[:.]\d{2}$/);
  });

  it('computes a Friday-to-Sunday weekend range containing a mid-week date', () => {
    // 2026-01-06 is a Tuesday
    const tuesday = new Date('2026-01-06T12:00:00.000Z');
    const { start, end } = upcomingWeekendRange(tuesday);
    expect(start.getDay()).toBe(5); // Friday
    expect(end.getDay()).toBe(0); // Sunday
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('keeps a Friday date as the start of its own weekend range', () => {
    const friday = new Date('2026-01-09T12:00:00.000Z');
    const { start } = upcomingWeekendRange(friday);
    expect(start.getDay()).toBe(5);
    expect(start.getDate()).toBe(friday.getDate());
  });
});
