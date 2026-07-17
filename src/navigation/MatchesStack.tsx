import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { MatchesHomeScreen } from '../screens/matches/MatchesHomeScreen';
import { CompetitionDetailsScreen } from '../screens/shared/CompetitionDetailsScreen';
import { TeamDetailsScreen } from '../screens/shared/TeamDetailsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { StandingsScreen } from '../screens/shared/StandingsScreen';
import type { MatchesStackParamList } from './types';

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export function MatchesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MatchesHome" component={MatchesHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CompetitionDetails" component={CompetitionDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="Standings" component={StandingsScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
