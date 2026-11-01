import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MyDataScreen } from '../screens/more/MyDataScreen';
import { MoreHomeScreen } from '../screens/more/MoreHomeScreen';
import { FavoriteCompetitionsScreen } from '../screens/more/FavoriteCompetitionsScreen';
import { FavoriteTeamsScreen } from '../screens/more/FavoriteTeamsScreen';
import { NotificationSettingsScreen } from '../screens/more/NotificationSettingsScreen';
import { LanguageSettingsScreen } from '../screens/more/LanguageSettingsScreen';
import { DisplaySettingsScreen } from '../screens/more/DisplaySettingsScreen';
import { WidgetSettingsScreen } from '../screens/more/WidgetSettingsScreen';
import { DataSourcesScreen } from '../screens/more/DataSourcesScreen';
import { DataManagementScreen } from '../screens/more/DataManagementScreen';
import { BackupRestoreScreen } from '../screens/more/BackupRestoreScreen';
import { AdvertisingPrivacyChoicesScreen } from '../screens/more/AdvertisingPrivacyChoicesScreen';
import { PrivacyPolicyScreen } from '../screens/more/PrivacyPolicyScreen';
import { AboutScreen } from '../screens/more/AboutScreen';
import { FavoritePlayersScreen } from '../screens/more/FavoritePlayersScreen';
import { ExportPreviewScreen } from '../screens/shared/ExportPreviewScreen';
import { InsightsHomeScreen } from '../screens/insights/InsightsHomeScreen';
import { TeamComparisonScreen } from '../screens/insights/TeamComparisonScreen';
import { TableScenarioScreen } from '../screens/insights/TableScenarioScreen';
import { StandingsScreen } from '../screens/shared/StandingsScreen';
import { TeamDetailsScreen } from '../screens/shared/TeamDetailsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { PlayerDetailsScreen } from '../screens/players/PlayerDetailsScreen';
import type { MoreStackParamList } from './types';

import { MatchdayToolsStack } from './MatchdayToolsStack';
import { PredictHomeScreen } from '../screens/predict/PredictHomeScreen';
import { PredictionEditorScreen } from '../screens/predict/PredictionEditorScreen';
import { PredictionDetailsScreen } from '../screens/predict/PredictionDetailsScreen';
const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MatchdayTools" component={MatchdayToolsStack} options={{headerShown:false}} />
      <Stack.Screen name="PredictHome" component={PredictHomeScreen} options={{title:t('makeover.privatePredictions')}} />
      <Stack.Screen name="PredictionEditor" component={PredictionEditorScreen} options={{title:t('makeover.privatePredictions')}} />
      <Stack.Screen name="PredictionDetails" component={PredictionDetailsScreen} options={{title:t('makeover.privatePredictions')}} />
      <Stack.Screen name="MyData" component={MyDataScreen} options={{ title: t('makeover.myData') }} />
      <Stack.Screen name="MoreHome" component={MoreHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FavoriteCompetitions" component={FavoriteCompetitionsScreen} options={{ title: t('more.favoriteCompetitions') }} />
      <Stack.Screen name="FavoriteTeams" component={FavoriteTeamsScreen} options={{ title: t('more.favoriteTeams') }} />
      <Stack.Screen name="FavoritePlayers" component={FavoritePlayersScreen} options={{ title: t('more.favoritePlayers') }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: t('more.notificationSettings') }} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} options={{ title: t('more.languageSettings') }} />
      <Stack.Screen name="DisplaySettings" component={DisplaySettingsScreen} options={{ title: t('more.display') }} />
      <Stack.Screen name="WidgetSettings" component={WidgetSettingsScreen} options={{ title: t('more.widgetSettings') }} />
      <Stack.Screen name="DataSources" component={DataSourcesScreen} options={{ title: t('dataSources.title') }} />
      <Stack.Screen name="DataManagement" component={DataManagementScreen} options={{ title: t('dataManagement.title') }} />
      <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} options={{ title: t('dataManagement.importBackup') }} />
      <Stack.Screen name="ExportPreview" component={ExportPreviewScreen} options={{ presentation: 'modal', title: t('common.export') }} />
      <Stack.Screen name="AdvertisingPrivacyChoices" component={AdvertisingPrivacyChoicesScreen} options={{ title: t('ads.privacyChoices') }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: t('about.privacyPolicy') }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: t('about.title') }} />
      <Stack.Screen name="InsightsHome" component={InsightsHomeScreen} options={{ title: t('insights.title') }} />
      <Stack.Screen name="TeamComparison" component={TeamComparisonScreen} options={{ title: t('insights.teamComparison') }} />
      <Stack.Screen name="TableScenario" component={TableScenarioScreen} options={{ title: t('insights.tableScenario') }} />
      <Stack.Screen name="Standings" component={StandingsScreen} options={{ title: t('insights.standings') }} />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ title: t('teamDetails.title') }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: t('matchDetails.title') }} />
      <Stack.Screen name="PlayerDetails" component={PlayerDetailsScreen} options={{ title: t('players.title') }} />
    </Stack.Navigator>
  );
}
