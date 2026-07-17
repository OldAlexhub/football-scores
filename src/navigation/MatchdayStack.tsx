import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { MatchdayHomeScreen } from '../screens/matchday/MatchdayHomeScreen';
import { ClashDetailsScreen } from '../screens/matchday/ClashDetailsScreen';
import { WeekendPlannerScreen } from '../screens/matchday/WeekendPlannerScreen';
import { ReminderEditorScreen } from '../screens/matchday/ReminderEditorScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { ExportPreviewScreen } from '../screens/shared/ExportPreviewScreen';
import type { MatchdayStackParamList } from './types';

const Stack = createNativeStackNavigator<MatchdayStackParamList>();

export function MatchdayStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MatchdayHome" component={MatchdayHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="ClashDetails" component={ClashDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="WeekendPlanner" component={WeekendPlannerScreen} options={{ title: '' }} />
      <Stack.Screen name="ReminderEditor" component={ReminderEditorScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="ExportPreview" component={ExportPreviewScreen} options={{ presentation: 'modal', title: '' }} />
    </Stack.Navigator>
  );
}
