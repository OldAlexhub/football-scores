export const cacheKeys = {
  matches: (dateFromUtc: string, dateToUtc: string, competitionProviderIds?: string[]) =>
    `matches:v3:${dateFromUtc}:${dateToUtc}:${competitionProviderIds ? [...competitionProviderIds].sort().join(',') : 'all'}`,
  competitions: () => 'competitions:all',
  standings: (competitionId: string) => `standings:${competitionId}`,
  teams: (competitionId: string) => `teams:${competitionId}`,
  headToHead: (homeTeamId: string, awayTeamId: string) => `h2h:${homeTeamId}:${awayTeamId}`,
  form: (teamId: string) => `form:${teamId}`,
  prediction: (matchId: string) => `prediction:${matchId}`,
  analysis: (matchId: string) => `analysis:${matchId}`,
};

export const CACHE_TTL_MS = {
  competitionMetadata: 24 * 60 * 60 * 1000,
  teamMetadata: 24 * 60 * 60 * 1000,
  upcomingFixtures: 6 * 60 * 60 * 1000,
  todayFixtures: 5 * 60 * 1000,
  liveFixtures: 30 * 1000,
  recentResults: 60 * 60 * 1000,
  standings: 60 * 60 * 1000,
  historical: 7 * 24 * 60 * 60 * 1000,
  prediction: 60 * 60 * 1000,
  preMatchAnalysis: 10 * 60 * 1000,
  liveMatchAnalysis: 45 * 1000,
  matchAnalysis: 24 * 60 * 60 * 1000,
};
