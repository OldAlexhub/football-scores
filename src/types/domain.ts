/**
 * Core domain model shared by every screen, provider adapter, and storage
 * repository. All times are stored as UTC ISO-8601 strings (or null when the
 * provider has not confirmed a kickoff time) and converted to the device
 * timezone only at render time.
 */

export type ProviderId =
  | 'openfootball'
  | 'thesportsdb'
  | 'espn'
  | 'football-data-org'
  | 'api-football'
  | 'cached';

export interface ProviderCapabilities {
  schedules: boolean;
  scores: boolean;
  delayedScores: boolean;
  liveStatus: boolean;
  standings: boolean;
  teams: boolean;
  competitionMetadata: boolean;
  headToHead: boolean;
  form: boolean;
  matchEvents: boolean;
  lineups: boolean;
  playerStatistics: boolean;
  knockoutStages: boolean;
  teamCrests: boolean;
  historicalSeasons: boolean;
  requiresApiKey: boolean;
  refreshLimits: {
    requestsPerMinute: number | null;
    requestsPerDay: number | null;
  };
}

export type CompetitionType = 'league' | 'knockout' | 'hybrid';

export interface Competition {
  id: string;
  providerId: ProviderId;
  providerCompetitionId: string;
  name: string;
  country: string | null;
  countryCode: string | null;
  type: CompetitionType;
  currentSeason: string | null;
  emblemUrl: string | null;
  isFavorite: boolean;
  favoriteOrder: number | null;
  lastRefreshedAt: string | null;
  attribution: string;
}

export interface Team {
  id: string;
  providerId: ProviderId;
  providerTeamId: string;
  name: string;
  shortName: string | null;
  initials: string;
  crestUrl: string | null;
  competitionIds: string[];
  isFavorite: boolean;
  favoriteOrder: number | null;
}

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'half_time'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'suspended'
  | 'abandoned';

export interface MatchScore {
  home: number | null;
  away: number | null;
}

export interface Match {
  id: string;
  providerId: ProviderId;
  providerMatchId: string;
  competitionId: string;
  competitionName: string;
  competitionEmblemUrl?: string | null;
  country: string | null;
  season: string | null;
  stage: string | null;
  round: string | null;
  matchweek: number | null;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamInitials: string;
  homeTeamCrestUrl: string | null;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamInitials: string;
  awayTeamCrestUrl: string | null;
  kickoffUtc: string | null;
  kickoffUnknown: boolean;
  status: MatchStatus;
  statusDetail?: string | null;
  elapsedMinutes?: number | null;
  injuryTimeMinutes?: number | null;
  halfTimeScore: MatchScore | null;
  fullTimeScore: MatchScore | null;
  extraTimeScore: MatchScore | null;
  penaltyScore: MatchScore | null;
  currentScore: MatchScore | null;
  winner: 'home' | 'away' | 'draw' | null;
  venue: string | null;
  referee?: string | null;
  attendance?: number | null;
  lastProviderUpdateUtc: string | null;
  isKnockout: boolean;
  extraTimePossible: boolean;
  attribution: string;
}

export interface MatchPrediction {
  matchId: string;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  homeWinPercent: number;
  drawPercent: number;
  awayWinPercent: number;
  confidencePercent: number;
  advice: string | null;
  goalRange: string | null;
  source: 'provider_model' | 'statistical_model';
  sampleSize: number;
  generatedAtUtc: string;
}

export type MatchEventType = 'goal' | 'card' | 'substitution' | 'var' | 'other';

export interface MatchEvent {
  id: string;
  minute: number;
  extraMinute: number | null;
  teamId: string;
  teamName: string;
  playerName: string | null;
  assistName: string | null;
  type: MatchEventType;
  detail: string;
}

export interface MatchStatistic {
  key: string;
  label: string;
  homeValue: string | number | null;
  awayValue: string | number | null;
}

export interface LineupPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  grid: string | null;
}

export interface MatchLineup {
  teamId: string;
  teamName: string;
  teamCrestUrl: string | null;
  formation: string | null;
  coachName: string | null;
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface PlayerMatchPerformance {
  playerId: string;
  playerName: string;
  playerPhotoUrl: string | null;
  teamId: string;
  teamName: string;
  rating: number | null;
  minutes: number | null;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  keyPasses: number;
  tackles: number;
}

export interface MatchAnalysis {
  matchId: string;
  providerId: ProviderId;
  events: MatchEvent[];
  statistics: MatchStatistic[];
  lineups: MatchLineup[];
  topPerformers: PlayerMatchPerformance[];
  summary: string[];
  hasExtendedData: boolean;
  generatedAtUtc: string;
}

export interface StandingRow {
  competitionId: string;
  season: string | null;
  tableType: 'overall' | 'home' | 'away';
  position: number;
  teamId: string;
  teamName: string;
  teamCrestUrl?: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[] | null;
  isProvisional: boolean;
}

export type FavoriteEntityType = 'competition' | 'team';

export interface Favorite {
  id: string;
  entityType: FavoriteEntityType;
  entityId: string;
  order: number;
  createdAt: string;
}

export type WatchPriority = 'low' | 'normal' | 'high';

export interface WatchPlanItem {
  id: string;
  matchId: string;
  priority: WatchPriority;
  watchLater: boolean;
  watched: boolean;
  notes: string;
  estimatedDurationMinutes: number;
  spoilerShieldEnabled: boolean;
  spoilerRevealed: boolean;
  spoilerRevealedPermanently: boolean;
  manuallyAdded: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ReminderStatus = 'scheduled' | 'needs_reschedule' | 'cancelled' | 'fired';

export interface Reminder {
  id: string;
  matchId: string;
  offsetMinutes: number;
  notificationId: string | null;
  scheduledForUtc: string | null;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
}

export type PredictionOutcome = 'home' | 'draw' | 'away';

export interface Prediction {
  id: string;
  matchId: string;
  outcome: PredictionOutcome;
  homeScore: number;
  awayScore: number;
  confidence: 1 | 2 | 3 | 4 | 5;
  note: string;
  createdAt: string;
  updatedAt: string;
  lockedAtUtc: string | null;
  gradedAt: string | null;
  pointsAwarded: number | null;
  isExactScore: boolean | null;
  isCorrectOutcome: boolean | null;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type ClockPreference = '12h' | '24h';
export type LanguagePreference = 'en' | 'ar';
export type DefaultTab = 'matches' | 'matchday' | 'predict' | 'insights' | 'more';

export interface UserPreferences {
  onboardingCompleted: boolean;
  language: LanguagePreference;
  theme: ThemePreference;
  clock: ClockPreference;
  defaultReminderOffsetMinutes: number;
  defaultSpoilerShieldEnabled: boolean;
  defaultOpeningTab: DefaultTab;
  showCompletedMatches: boolean;
  notificationsEnabled: boolean;
}

export interface ProviderCacheEntry<T = unknown> {
  cacheKey: string;
  providerId: ProviderId;
  payload: T;
  fetchedAtUtc: string;
  expiresAtUtc: string;
}

export interface AdFrequencyState {
  lastInterstitialAt: string | null;
  firstSessionStartedAt: string | null;
  activeSessionStartedAt: string | null;
  activeSessionInterstitialCount: number;
  rollingDayInterstitialCount: number;
  rollingDayStartedAt: string | null;
  eligibleActionCount: number;
  lastEligibleActionType: string | null;
  bannerLastRequestedAt: string | null;
  bannerLastImpressionAt: string | null;
  appSessionCount: number;
  lastAppOpenAdAt: string | null;
}

export interface AdSessionState {
  sessionId: string;
  startedAtUtc: string;
  lastForegroundAtUtc: string;
}

export type AdPlacementName =
  | 'match_detail_open'
  | 'news_article_open'
  | 'weekend_planner_done'
  | 'weekend_planner_share'
  | 'prediction_save_milestone'
  | 'prediction_export'
  | 'backup_export'
  | 'prediction_stats_card'
  | 'table_scenario_saved'
  | 'reminder_batch_done'
  | 'ics_export_done';

export interface AdPlacementState {
  placement: AdPlacementName;
  lastShownAt: string | null;
  timesShown: number;
}

export interface WidgetSnapshotMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffIso: string | null;
  kickoffUnknown: boolean;
  status: MatchStatus;
  statusDetail: string | null;
  elapsedMinutes: number | null;
  homeScore: number | null;
  awayScore: number | null;
  reminderSet: boolean;
  spoilerProtected: boolean;
}

export interface WidgetSnapshot {
  nextMatch: WidgetSnapshotMatch | null;
  upcoming: WidgetSnapshotMatch[];
  clashWarning: boolean;
  reminderSet: boolean;
  generatedAtIso: string;
  locale: LanguagePreference;
}

export interface BackupMetadata {
  appVersion: string;
  schemaVersion: number;
  createdAtUtc: string;
  recordCounts: Record<string, number>;
}

export interface CompleteBackup {
  metadata: BackupMetadata;
  favorites: Favorite[];
  watchPlanItems: WatchPlanItem[];
  reminders: Reminder[];
  predictions: Prediction[];
  preferences: UserPreferences;
}

export type NewsCategory = 'general' | 'transfer';

/**
 * A headline + short snippet pulled from a publisher's own public RSS feed,
 * always paired with source attribution and an outbound link to the full
 * article on the publisher's site — this app never reproduces full article
 * text, which would be copyright infringement regardless of how the app
 * itself is built.
 */
export interface NewsArticle {
  id: string;
  title: string;
  snippet: string;
  link: string;
  sourceName: string;
  imageUrl: string | null;
  publishedAtUtc: string | null;
  category: NewsCategory;
}
