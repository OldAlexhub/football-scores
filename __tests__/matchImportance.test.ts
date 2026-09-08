import { pickMatchOfTheDay, scoreMatchImportance } from '../src/services/matchImportance';
import type { Match } from '../src/types/domain';

const NOW = new Date('2026-09-08T10:00:00.000Z');

function fixture(partial: Partial<Match>): Match {
  return {
    id: 'x', providerId: 'espn', providerMatchId: 'x',
    competitionId: 'x', competitionName: 'Friendly', competitionEmblemUrl: null,
    country: null, season: null, stage: null, round: null, matchweek: null,
    homeTeamId: 'h', homeTeamName: 'Home Town', homeTeamInitials: 'HOM', homeTeamCrestUrl: null,
    awayTeamId: 'a', awayTeamName: 'Away City', awayTeamInitials: 'AWA', awayTeamCrestUrl: null,
    kickoffUtc: '2026-09-08T14:00:00.000Z', kickoffUnknown: false,
    status: 'scheduled', halfTimeScore: null, fullTimeScore: null, extraTimeScore: null,
    penaltyScore: null, currentScore: null, winner: null, venue: null,
    lastProviderUpdateUtc: null, isKnockout: false, extraTimePossible: false, attribution: 'x',
    ...partial,
  };
}

describe('scoreMatchImportance', () => {
  it('ranks a Champions League final above a mid-table Premier League game above League Two', () => {
    const clFinal = fixture({ competitionName: 'UEFA Champions League', catalogKey: 'champions-league', round: 'Final', isKnockout: true });
    const pl = fixture({ competitionName: 'Premier League', catalogKey: 'premier-league' });
    const leagueTwo = fixture({ competitionName: 'League Two' });
    const s1 = scoreMatchImportance(clFinal, { now: NOW });
    const s2 = scoreMatchImportance(pl, { now: NOW });
    const s3 = scoreMatchImportance(leagueTwo, { now: NOW });
    expect(s1).toBeGreaterThan(s2);
    expect(s2).toBeGreaterThan(s3);
  });

  it('boosts a live match and a followed team', () => {
    const base = fixture({ competitionName: 'Premier League', catalogKey: 'premier-league' });
    const live = scoreMatchImportance({ ...base, status: 'live' }, { now: NOW });
    const idle = scoreMatchImportance(base, { now: NOW });
    expect(live).toBeGreaterThan(idle);

    const withFollow = scoreMatchImportance(
      fixture({ competitionName: 'Premier League', catalogKey: 'premier-league', homeTeamName: 'Arsenal' }),
      { now: NOW, followedTeamNames: new Set(['arsenal']) },
    );
    expect(withFollow).toBeGreaterThan(idle);
  });
});

describe('pickMatchOfTheDay', () => {
  it('returns null when nothing is in the window', () => {
    expect(pickMatchOfTheDay([fixture({ kickoffUtc: '2026-10-01T14:00:00.000Z' })], { now: NOW })).toBeNull();
  });

  it('picks the highest-importance fixture in range', () => {
    const derby = fixture({ competitionName: 'Premier League', catalogKey: 'premier-league', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea' });
    const minor = fixture({ id: 'y', competitionName: 'League Two', homeTeamName: 'Team A', awayTeamName: 'Team B' });
    expect(pickMatchOfTheDay([minor, derby], { now: NOW })?.homeTeamName).toBe('Arsenal');
  });
});
