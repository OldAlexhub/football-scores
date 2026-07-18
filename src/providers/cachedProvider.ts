import { readCache } from '../storage/repositories/providerCacheRepo';
import type { Competition, Match, StandingRow, Team } from '../types/domain';
import { cacheKeys } from './cacheKeys';
import { CACHED_PROVIDER_CAPABILITIES } from './capabilities';
import type { FootballDataProvider, FormResult, HeadToHeadResult, MatchesQuery } from './types';

/**
 * Serves the last successfully fetched, normalized payload for a given
 * cache key. This is the provider every screen falls back to when the
 * device is offline or every live provider has just failed — it never
 * makes a network request itself.
 */
class CachedProvider implements FootballDataProvider {
  readonly id = 'cached' as const;
  readonly displayName = 'Cached data';
  readonly capabilities = CACHED_PROVIDER_CAPABILITIES;

  isConfigured(): boolean {
    return true;
  }

  async getCompetitions(): Promise<Competition[]> {
    const cached = await readCache<Competition[]>(cacheKeys.competitions());
    return cached?.payload ?? [];
  }

  async getMatches(query: MatchesQuery): Promise<Match[]> {
    const cached = await readCache<Match[]>(cacheKeys.matches(query.dateFromUtc, query.dateToUtc, query.competitionProviderIds));
    return cached?.payload ?? [];
  }

  async getMatch(providerMatchId: string): Promise<Match | null> {
    void providerMatchId;
    return null;
  }

  async getStandings(competitionProviderId: string): Promise<StandingRow[]> {
    const cached = await readCache<StandingRow[]>(cacheKeys.standings(competitionProviderId));
    return cached?.payload ?? [];
  }

  async getTeams(competitionProviderId: string): Promise<Team[]> {
    const cached = await readCache<Team[]>(cacheKeys.teams(competitionProviderId));
    return cached?.payload ?? [];
  }

  async getTeam(): Promise<Team | null> {
    return null;
  }

  async getHeadToHead(homeTeamProviderId: string, awayTeamProviderId: string): Promise<HeadToHeadResult> {
    const cached = await readCache<HeadToHeadResult>(cacheKeys.headToHead(homeTeamProviderId, awayTeamProviderId));
    return cached?.payload ?? { matches: [], totalMeetings: 0 };
  }

  async getForm(teamProviderId: string): Promise<FormResult> {
    const cached = await readCache<FormResult>(cacheKeys.form(teamProviderId));
    return cached?.payload ?? { lastFive: [], homeForm: [], awayForm: [] };
  }
}

export const cachedProvider = new CachedProvider();
