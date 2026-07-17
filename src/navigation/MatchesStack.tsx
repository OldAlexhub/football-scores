import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MatchesHomeScreen } from '../screens/matches/MatchesHomeScreen';
import { CompetitionDetailsScreen } from '../screens/shared/CompetitionDetailsScreen';
import { TeamDetailsScreen } from '../screens/shared/TeamDetailsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { StandingsScreen } from '../screens/shared/StandingsScreen';
import { NewsScreen } from '../screens/news/NewsScreen';
import type { MatchesStackParamList } from './types';

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export function MatchesStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MatchesHome" component={MatchesHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CompetitionDetails" component={CompetitionDetailsScreen} options={{ title: t('competitionDetails.title') }} />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ title: t('teamDetails.title') }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: t('matchDetails.title') }} />
      <Stack.Screen name="Standings" component={StandingsScreen} options={{ title: t('insights.standings') }} />
      <Stack.Screen name="News" component={NewsScreen} options={{ title: t('news.title') }} />
    </Stack.Navigator>
  );
}
