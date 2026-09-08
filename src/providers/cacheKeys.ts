/** Cap offered in the Matches screen's custom date-range picker. */
export const MAX_RANGE_DAYS = 31;
/** Absolute ceiling enforced by the provider layer (covers the reminder/prediction resolve window). */
export const HARD_MAX_RANGE_DAYS = 60;
/** ESPN scoreboard fetches are per-day; cap the span we sweep in one refresh. */
export const MAX_ESPN_RANGE_DAYS = 14;

export const cacheKeys = {
  matches: (dateFromUtc: string, dateToUtc: string, competitionProviderIds?: string[]) =>
    `matches:v4:${dateFromUtc}:${dateToUtc}:${competitionProviderIds ? [...competitionProviderIds].sort().join(',') : 'all'}`,
  competitions: () => 'competitions:all',
  standings: (competitionId: string) => `standings:${competitionId}`,
  teams: (competitionId: string) => `teams:${competitionId}`,
  headToHead: (homeTeamId: string, awayTeamId: string) => `h2h:${homeTeamId}:${awayTeamId}`,
  form: (teamId: string) => `form:${teamId}`,
  prediction: (matchId: string) => `prediction:${matchId}`,
  analysis: (matchId: string) => `analysis:${matchId}`,
  espnScoreboard: (leagueCode: string, dateKey: string) => `espn:sb:${leagueCode}:${dateKey}`,
  news: () => 'news:v2:all',
  playerSearch: (query: string) => `player:search:${query.trim().toLowerCase()}`,
  playerProfile: (playerId: string) => `player:profile:${playerId}`,
};

export const CACHE_TTL_MS = {
  competitionMetadata: 24 * 60 * 60 * 1000,
  teamMetadata: 24 * 60 * 60 * 1000,
  upcomingFixtures: 6 * 60 * 60 * 1000,
  rangeFixtures: 12 * 60 * 60 * 1000,
  todayFixtures: 5 * 60 * 1000,
  liveFixtures: 30 * 1000,
  recentResults: 60 * 60 * 1000,
  standings: 60 * 60 * 1000,
  historical: 7 * 24 * 60 * 60 * 1000,
  prediction: 60 * 60 * 1000,
  preMatchAnalysis: 10 * 60 * 1000,
  liveMatchAnalysis: 45 * 1000,
  matchAnalysis: 24 * 60 * 60 * 1000,
  espnScoreboardLive: 60 * 1000,
  espnScoreboardIdle: 6 * 60 * 60 * 1000,
  news: 30 * 60 * 1000,
  playerSearch: 24 * 60 * 60 * 1000,
  playerProfile: 14 * 24 * 60 * 60 * 1000,
};
