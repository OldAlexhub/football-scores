import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Match } from '../types/domain';

export interface MatchDetailsParams {
  matchId: string;
  match?: Match;
}

export type MatchesStackParamList = {
  MatchesHome: undefined;
  CompetitionDetails: { competitionId: string };
  TeamDetails: { teamId: string };
  MatchDetails: MatchDetailsParams;
  Standings: { competitionId: string };
};

export type MatchdayStackParamList = {
  MatchdayHome: undefined;
  MatchDetails: MatchDetailsParams;
  ClashDetails: { matchIds: string[] };
  WeekendPlanner: undefined;
  ReminderEditor: MatchDetailsParams;
  ExportPreview: { kind: 'matchday_item' | 'matchday_plan' | 'weekend_plan'; matchId?: string };
};

export type PredictStackParamList = {
  PredictHome: undefined;
  PredictionEditor: MatchDetailsParams;
  PredictionDetails: { matchId: string };
  MatchDetails: MatchDetailsParams;
  ExportPreview: { kind: 'predictions_csv' | 'predictions_json' | 'prediction_card' | 'stats_card'; matchId?: string };
};

export type InsightsStackParamList = {
  InsightsHome: undefined;
  Standings: { competitionId: string };
  TeamDetails: { teamId: string };
  MatchDetails: MatchDetailsParams;
  TeamComparison: { competitionId: string } | undefined;
  TableScenario: { competitionId: string };
};

export type MoreStackParamList = {
  MoreHome: undefined;
  FavoriteCompetitions: undefined;
  FavoriteTeams: undefined;
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
};

export type MainTabParamList = {
  MatchesTab: NavigatorScreenParams<MatchesStackParamList>;
  MatchdayTab: NavigatorScreenParams<MatchdayStackParamList>;
  PredictTab: NavigatorScreenParams<PredictStackParamList>;
  InsightsTab: NavigatorScreenParams<InsightsStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
