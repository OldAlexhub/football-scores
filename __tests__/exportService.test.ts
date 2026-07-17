import { buildIcsCalendar, buildMatchdayJson, buildPredictionsCsv, buildPredictionsJson } from '../src/services/exportService';
import type { PredictionRecord } from '../src/storage/repositories/predictionsRepo';
import type { WatchPlanItem } from '../src/types/domain';

function makePrediction(overrides: Partial<PredictionRecord> = {}): PredictionRecord {
  return {
    id: 'p1',
    matchId: 'm1',
    outcome: 'home',
    homeScore: 2,
    awayScore: 1,
    confidence: 3,
    note: 'contains, a comma and "quotes"',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lockedAtUtc: null,
    gradedAt: null,
    pointsAwarded: null,
    isExactScore: null,
    isCorrectOutcome: null,
    competitionId: 'c1',
    competitionName: 'Premier League',
    homeTeamId: 'h1',
    homeTeamName: 'مدينة',
    awayTeamId: 'a1',
    awayTeamName: 'Away FC',
    kickoffUtc: '2026-01-10T18:30:00.000Z',
    ...overrides,
  };
}

describe('export service', () => {
  it('escapes commas and quotes in CSV output', () => {
    const csv = buildPredictionsCsv([makePrediction()]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Competition');
    expect(lines[1]).toContain('"contains, a comma and ""quotes"""');
  });

  it('preserves unicode team names in CSV', () => {
    const csv = buildPredictionsCsv([makePrediction()]);
    expect(csv).toContain('مدينة');
  });

  it('produces valid JSON for predictions export', () => {
    const json = buildPredictionsJson([makePrediction()]);
    const parsed = JSON.parse(json);
    expect(parsed.predictions).toHaveLength(1);
    expect(parsed.app).toBe('Football Scores Today');
  });

  it('produces valid JSON for a matchday plan export', () => {
    const item: WatchPlanItem = {
      id: 'w1', matchId: 'm1', priority: 'high', watchLater: false, watched: false, notes: '',
      estimatedDurationMinutes: 120, spoilerShieldEnabled: true, spoilerRevealed: false,
      spoilerRevealedPermanently: false, manuallyAdded: true, order: 0,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const json = buildMatchdayJson([item]);
    const parsed = JSON.parse(json);
    expect(parsed.watchPlanItems).toHaveLength(1);
  });

  it('produces a valid ICS calendar with escaped special characters', () => {
    const ics = buildIcsCalendar([
      {
        uid: 'm1',
        title: 'Team A, vs Team B; Final',
        description: 'Group stage, matchday 1',
        startUtc: '2026-01-10T18:30:00.000Z',
        endUtc: '2026-01-10T20:30:00.000Z',
        location: 'Some Stadium',
      },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('DTSTART:20260110T183000Z');
    expect(ics).toContain('SUMMARY:Team A\\, vs Team B\\; Final');
  });

  it('never includes an advertisement marker in exported content', () => {
    const csv = buildPredictionsCsv([makePrediction()]);
    const ics = buildIcsCalendar([]);
    expect(csv.toLowerCase()).not.toContain('admob');
    expect(ics.toLowerCase()).not.toContain('admob');
  });
});
