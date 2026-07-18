import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { usePreferences } from '../state/PreferencesContext';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { preferences } = usePreferences();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {preferences.onboardingCompleted ? (
        <Stack.Screen name="MainTabs">
          {() => <TabNavigator defaultTab={preferences.defaultOpeningTab} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
    </Stack.Navigator>
  );
}

export const linkingConfig = {
  prefixes: ['footballscores://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          MatchesTab: {
            screens: {
              MatchesHome: 'matches',
              MatchDetails: 'match/:matchId',
            },
          },
        },
      },
    },
  },
};
