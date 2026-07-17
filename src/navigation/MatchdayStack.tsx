import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MatchdayHomeScreen } from '../screens/matchday/MatchdayHomeScreen';
import { ClashDetailsScreen } from '../screens/matchday/ClashDetailsScreen';
import { WeekendPlannerScreen } from '../screens/matchday/WeekendPlannerScreen';
import { ReminderEditorScreen } from '../screens/matchday/ReminderEditorScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { ExportPreviewScreen } from '../screens/shared/ExportPreviewScreen';
import type { MatchdayStackParamList } from './types';

const Stack = createNativeStackNavigator<MatchdayStackParamList>();

export function MatchdayStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MatchdayHome" component={MatchdayHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: t('matchDetails.title') }} />
      <Stack.Screen name="ClashDetails" component={ClashDetailsScreen} options={{ title: t('clash.title') }} />
      <Stack.Screen name="WeekendPlanner" component={WeekendPlannerScreen} options={{ title: t('weekendPlanner.title') }} />
      <Stack.Screen name="ReminderEditor" component={ReminderEditorScreen} options={{ presentation: 'modal', title: t('reminders.title') }} />
      <Stack.Screen name="ExportPreview" component={ExportPreviewScreen} options={{ presentation: 'modal', title: t('common.export') }} />
    </Stack.Navigator>
  );
}
