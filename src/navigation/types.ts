import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Match } from '../types/domain';

export interface MatchDetailsParams {
  matchId: string;
  match?: Match;
}

export interface PlayerDetailsParams {
  /** Provider player id (`thesportsdb:34146...`), when known. */
  playerId?: string;
  /** Free-text name to resolve when there is no id (e.g. tapped from a lineup). */
  query?: string;
}

export type MatchesStackParamList = {
  MatchesHome: undefined;
  CompetitionDetails: { competitionId: string };
  TeamDetails: { teamId: string };
  MatchDetails: MatchDetailsParams;
  Standings: { competitionId: string };
  PlayerDetails: PlayerDetailsParams;
  News: undefined;
};

export type HomeStackParamList = {
  HomeDashboard: undefined;
  News: undefined;
  MatchDetails: MatchDetailsParams;
  PlayerDetails: PlayerDetailsParams;
  Standings: { competitionId: string };
  CompetitionDetails: { competitionId: string };
};

export type PlayersStackParamList = {
  PlayersHome: undefined;
  PlayerDetails: PlayerDetailsParams;
  MatchDetails: MatchDetailsParams;
};

/**
 * Retained only so the (currently unmounted) Matchday screens keep compiling.
 * Not wired into any navigator.
 */
export type MatchdayStackParamList = {
  MatchdayHome: undefined;
  MatchDetails: MatchDetailsParams;
  ClashDetails: { matchIds: string[] };
  WeekendPlanner: undefined;
  ReminderEditor: MatchDetailsParams;
  ExportPreview: { kind: 'matchday_item' | 'matchday_plan' | 'weekend_plan'; matchId?: string };
};

export type MoreStackParamList = {
  MoreHome: undefined;
  FavoriteCompetitions: undefined;
  FavoriteTeams: undefined;
  FavoritePlayers: undefined;
  NotificationSettings: undefined;
  LanguageSettings: undefined;
  DisplaySettings: undefined;
  WidgetSettings: undefined;
  DataSources: undefined;
  DataManagement: undefined;
  BackupRestore: undefined;
  ExportPreview: { kind: 'backup' };
  AdvertisingPrivacyChoices: undefined;
  PrivacyPolicy: undefined;
  About: undefined;
  InsightsHome: undefined;
  TeamComparison: { competitionId: string } | undefined;
  TableScenario: { competitionId: string };
  Standings: { competitionId: string };
  TeamDetails: { teamId: string };
  MatchDetails: MatchDetailsParams;
  PlayerDetails: PlayerDetailsParams;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  MatchesTab: NavigatorScreenParams<MatchesStackParamList>;
  PlayersTab: NavigatorScreenParams<PlayersStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
