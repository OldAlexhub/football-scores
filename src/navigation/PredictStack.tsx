import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { PredictHomeScreen } from '../screens/predict/PredictHomeScreen';
import { PredictionEditorScreen } from '../screens/predict/PredictionEditorScreen';
import { PredictionDetailsScreen } from '../screens/predict/PredictionDetailsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import { ExportPreviewScreen } from '../screens/shared/ExportPreviewScreen';
import type { PredictStackParamList } from './types';

const Stack = createNativeStackNavigator<PredictStackParamList>();

export function PredictStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="PredictHome" component={PredictHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PredictionEditor" component={PredictionEditorScreen} options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="PredictionDetails" component={PredictionDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: '' }} />
      <Stack.Screen name="ExportPreview" component={ExportPreviewScreen} options={{ presentation: 'modal', title: '' }} />
    </Stack.Navigator>
  );
}
