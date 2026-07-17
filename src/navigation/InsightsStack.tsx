import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { InsightsHomeScreen } from '../screens/insights/InsightsHomeScreen';
import { TeamComparisonScreen } from '../screens/insights/TeamComparisonScreen';
import { TableScenarioScreen } from '../screens/insights/TableScenarioScreen';
import { StandingsScreen } from '../screens/shared/StandingsScreen';
import { TeamDetailsScreen } from '../screens/shared/TeamDetailsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { NewsScreen } from '../screens/news/NewsScreen';
import type { InsightsStackParamList } from './types';

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function InsightsStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="InsightsHome" component={InsightsHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Standings" component={StandingsScreen} options={{ title: t('insights.standings') }} />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ title: t('teamDetails.title') }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: t('matchDetails.title') }} />
      <Stack.Screen name="TeamComparison" component={TeamComparisonScreen} options={{ title: t('insights.teamComparison') }} />
      <Stack.Screen name="TableScenario" component={TableScenarioScreen} options={{ title: t('insights.tableScenario') }} />
      <Stack.Screen name="News" component={NewsScreen} options={{ title: t('news.title') }} />
    </Stack.Navigator>
  );
}
