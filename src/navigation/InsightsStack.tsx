import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { InsightsHomeScreen } from '../screens/insights/InsightsHomeScreen';
import { TeamComparisonScreen } from '../screens/insights/TeamComparisonScreen';
import { TableScenarioScreen } from '../screens/insights/TableScenarioScreen';
import { StandingsScreen } from '../screens/shared/StandingsScreen';
import { TeamDetailsScreen } from '../screens/shared/TeamDetailsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import type { InsightsStackParamList } from './types';

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function InsightsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="InsightsHome" component={InsightsHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Standings" component={StandingsScreen} options={{ title: '' }} />
      <Stack.Screen name="TeamDetails" component={TeamDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="TeamComparison" component={TeamComparisonScreen} options={{ title: '' }} />
      <Stack.Screen name="TableScenario" component={TableScenarioScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
