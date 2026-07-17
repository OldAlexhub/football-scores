import type {
  Competition,
  Match,
  ProviderCapabilities,
  ProviderId,
  StandingRow,
  Team,
} from '../types/domain';

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | 'network'
      | 'timeout'
      | 'unauthorized'
      | 'forbidden'
      | 'not_found'
      | 'rate_limited'
      | 'server'
      | 'invalid_response'
      | 'not_configured',
    public readonly providerId: ProviderId,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface MatchesQuery {
  dateFromUtc: string;
  dateToUtc: string;
  competitionProviderIds?: string[];
}

export interface HeadToHeadResult {
  matches: Match[];
  totalMeetings: number;
}

export interface FormResult {
  lastFive: ('W' | 'D' | 'L')[];
  homeForm: ('W' | 'D' | 'L')[];
  awayForm: ('W' | 'D' | 'L')[];
}

/**
 * Normalized contract every football data source implements. Screens must
 * check `capabilities` before rendering a feature — never assume a method
 * returns non-empty data just because it exists on the interface.
 */
export interface FootballDataProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  isConfigured(): boolean;

  getCompetitions(): Promise<Competition[]>;
  getMatches(query: MatchesQuery): Promise<Match[]>;
  getMatch(providerMatchId: string): Promise<Match | null>;
  getStandings(competitionProviderId: string, season?: string): Promise<StandingRow[]>;
  getTeams(competitionProviderId: string): Promise<Team[]>;
  getTeam(providerTeamId: string): Promise<Team | null>;
  getHeadToHead(homeTeamProviderId: string, awayTeamProviderId: string): Promise<HeadToHeadResult>;
  getForm(teamProviderId: string): Promise<FormResult>;
}
