import {
  canonicalTeam,
  matchIdentityKey,
  normalizeCompetitionName,
  normalizeTeamName,
  sameFixture,
} from '../src/providers/nameMatch';

describe('normalizeTeamName', () => {
  it('strips diacritics without collapsing clubs that share a city', () => {
    expect(canonicalTeam('Atlético Madrid')).toBe('atletico madrid');
    expect(canonicalTeam('Real Madrid')).toBe('real madrid');
    expect(canonicalTeam('Atlético Madrid')).not.toBe(canonicalTeam('Real Madrid'));
  });

  it('drops org-type tokens (FC / CF / SC) but keeps semantic words', () => {
    expect(normalizeTeamName('Arsenal FC')).toBe('arsenal');
    expect(normalizeTeamName('FC Barcelona')).toBe('barcelona');
    expect(normalizeTeamName('Athletic Club')).toBe('athletic');
    expect(normalizeTeamName('Athletic Club')).toContain('athletic');
  });

  it('drops standalone digit tokens ("Bayer 04 Leverkusen")', () => {
    expect(canonicalTeam('Bayer 04 Leverkusen')).toBe('bayer leverkusen');
    expect(canonicalTeam('Bayer Leverkusen')).toBe('bayer leverkusen');
  });

  it('resolves nicknames and cross-language names via the alias map', () => {
    expect(canonicalTeam('Man Utd')).toBe('manchester united');
    expect(canonicalTeam('Manchester United')).toBe('manchester united');
    expect(canonicalTeam('Bayern Munich')).toBe(canonicalTeam('FC Bayern München'));
    expect(canonicalTeam('1. FC Köln')).toBe(canonicalTeam('FC Cologne'));
  });
});

describe('matchIdentityKey', () => {
  it('is order-independent (home/away swap still groups)', () => {
    expect(matchIdentityKey('Arsenal', 'Chelsea')).toBe(matchIdentityKey('Chelsea', 'Arsenal'));
  });
});

describe('sameFixture', () => {
  const base = { homeTeamName: 'Arsenal', awayTeamName: 'Chelsea' };

  it('merges the same fixture reported ~90 min apart by two providers', () => {
    expect(
      sameFixture(
        { ...base, kickoffUtc: '2026-09-08T14:00:00Z' },
        { homeTeamName: 'Arsenal FC', awayTeamName: 'Chelsea FC', kickoffUtc: '2026-09-08T15:30:00Z' },
      ),
    ).toBe(true);
  });

  it('does NOT merge the two legs of a tie a week apart', () => {
    expect(
      sameFixture(
        { ...base, kickoffUtc: '2026-09-08T14:00:00Z' },
        { ...base, kickoffUtc: '2026-09-15T14:00:00Z' },
      ),
    ).toBe(false);
  });

  it('falls back to same-UTC-day when one side has no confirmed kickoff', () => {
    expect(
      sameFixture(
        { ...base, kickoffUtc: '2026-09-08T12:00:00Z', kickoffUnknown: true },
        { ...base, kickoffUtc: '2026-09-08T19:45:00Z' },
      ),
    ).toBe(true);
  });
});

describe('normalizeCompetitionName', () => {
  it('drops confederation prefixes so "UEFA Champions League" == "Champions League"', () => {
    expect(normalizeCompetitionName('UEFA Champions League')).toBe('champions league');
    expect(normalizeCompetitionName('Champions League')).toBe('champions league');
  });
});
