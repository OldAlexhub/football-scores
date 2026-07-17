export const cacheKeys = {
  matches: (dateFromUtc: string, dateToUtc: string) =>
    `matches:${dateFromUtc.slice(0, 10)}:${dateToUtc.slice(0, 10)}`,
  competitions: () => 'competitions:all',
  standings: (competitionId: string) => `standings:${competitionId}`,
  teams: (competitionId: string) => `teams:${competitionId}`,
  headToHead: (homeTeamId: string, awayTeamId: string) => `h2h:${homeTeamId}:${awayTeamId}`,
  form: (teamId: string) => `form:${teamId}`,
};

export const CACHE_TTL_MS = {
  competitionMetadata: 24 * 60 * 60 * 1000,
  teamMetadata: 24 * 60 * 60 * 1000,
  upcomingFixtures: 6 * 60 * 60 * 1000,
  recentResults: 60 * 60 * 1000,
  standings: 60 * 60 * 1000,
  historical: 7 * 24 * 60 * 60 * 1000,
};
