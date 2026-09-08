import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { HomeDashboardScreen } from '../screens/home/HomeDashboardScreen';
import { NewsScreen } from '../screens/news/NewsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { CompetitionDetailsScreen } from '../screens/shared/CompetitionDetailsScreen';
import { StandingsScreen } from '../screens/shared/StandingsScreen';
import { PlayerDetailsScreen } from '../screens/players/PlayerDetailsScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="HomeDashboard" component={HomeDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="News" component={NewsScreen} options={{ title: t('news.title') }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: t('matchDetails.title') }} />
      <Stack.Screen name="PlayerDetails" component={PlayerDetailsScreen} options={{ title: t('players.title') }} />
      <Stack.Screen name="Standings" component={StandingsScreen} options={{ title: t('insights.standings') }} />
      <Stack.Screen name="CompetitionDetails" component={CompetitionDetailsScreen} options={{ title: t('competitionDetails.title') }} />
    </Stack.Navigator>
  );
}
