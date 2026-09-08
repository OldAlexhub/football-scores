import { mergeMatches } from '../src/providers/matchMerge';
import type { Match, ProviderId } from '../src/types/domain';

function make(partial: Partial<Match> & { providerId: ProviderId; homeTeamName: string; awayTeamName: string }): Match {
  const id = `${partial.providerId}:${partial.homeTeamName}-${partial.awayTeamName}`.replace(/\s+/g, '');
  return {
    id,
    providerMatchId: id.split(':')[1],
    competitionId: 'x:1',
    competitionName: 'Comp',
    competitionEmblemUrl: null,
    country: null,
    season: null,
    stage: null,
    round: null,
    matchweek: null,
    homeTeamId: `${partial.providerId}:home`,
    homeTeamInitials: 'HOM',
    homeTeamCrestUrl: null,
    awayTeamId: `${partial.providerId}:away`,
    awayTeamInitials: 'AWA',
    awayTeamCrestUrl: null,
    kickoffUtc: '2026-09-08T14:00:00.000Z',
    kickoffUnknown: false,
    status: 'scheduled',
    halfTimeScore: null,
    fullTimeScore: null,
    extraTimeScore: null,
    penaltyScore: null,
    currentScore: null,
    winner: null,
    venue: null,
    lastProviderUpdateUtc: null,
    isKnockout: false,
    extraTimePossible: false,
    attribution: String(partial.providerId),
    ...partial,
  };
}

const ctx = { resolveCatalog: () => null };

describe('mergeMatches', () => {
  it('collapses the same fixture seen by three providers into one record', () => {
    const merged = mergeMatches(
      [
        [make({ providerId: 'openfootball', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea' })],
        [make({ providerId: 'thesportsdb', homeTeamName: 'Arsenal FC', awayTeamName: 'Chelsea FC' })],
        [make({ providerId: 'espn', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea' })],
      ],
      ctx,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].sourceIds?.sort()).toEqual(['espn', 'openfootball', 'thesportsdb']);
  });

  it('takes a live status + score over a provider still reporting "scheduled"', () => {
    const merged = mergeMatches(
      [
        [make({ providerId: 'openfootball', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea', status: 'scheduled' })],
        [make({
          providerId: 'espn', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea',
          status: 'live', currentScore: { home: 1, away: 0 }, elapsedMinutes: 63,
        })],
      ],
      ctx,
    );
    expect(merged[0].status).toBe('live');
    expect(merged[0].currentScore).toEqual({ home: 1, away: 0 });
    expect(merged[0].elapsedMinutes).toBe(63);
  });

  it('back-fills a missing crest from another provider', () => {
    const merged = mergeMatches(
      [
        [make({ providerId: 'espn', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea', homeTeamCrestUrl: null })],
        [make({ providerId: 'thesportsdb', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea', homeTeamCrestUrl: 'https://x/crest.png' })],
      ],
      ctx,
    );
    expect(merged[0].homeTeamCrestUrl).toBe('https://x/crest.png');
  });

  it('stamps canonical competition + tier from the injected catalog resolver', () => {
    const merged = mergeMatches(
      [[make({ providerId: 'espn', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea', competitionName: 'English Premier League' })]],
      {
        resolveCatalog: () => ({
          key: 'premier-league', canonicalId: 'openfootball:en.1', canonicalName: 'Premier League',
          tier: 2, label: 'Premier League', names: [], sportsDbLeagueId: '4328', category: 'domestic',
        }) as never,
      },
    );
    expect(merged[0].catalogKey).toBe('premier-league');
    expect(merged[0].competitionName).toBe('Premier League');
    expect(merged[0].competitionId).toBe('openfootball:en.1');
  });

  it('ignores an empty provider result instead of treating it as a signal', () => {
    const merged = mergeMatches(
      [[], [make({ providerId: 'espn', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea' })]],
      ctx,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].providerId).toBe('espn');
  });

  it('reuses a previous id so reminders stay linked when the top provider drops out', () => {
    const previous = [make({ providerId: 'espn', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea' })];
    const previousId = previous[0].id;
    const merged = mergeMatches(
      [[make({ providerId: 'openfootball', homeTeamName: 'Arsenal', awayTeamName: 'Chelsea' })]],
      { ...ctx, previous },
    );
    expect(merged[0].id).toBe(previousId);
    expect(merged[0].providerId).toBe('espn');
  });
});
