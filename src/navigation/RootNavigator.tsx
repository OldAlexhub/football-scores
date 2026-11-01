import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { usePreferences } from '../state/PreferencesContext';
import { DataDisclosureScreen } from '../screens/onboarding/DataDisclosureScreen';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { preferences } = usePreferences();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {preferences.dataDisclosureVersion !== 1 ? <Stack.Screen name="DataDisclosure" component={DataDisclosureScreen} /> : preferences.onboardingCompleted ? (
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
          HomeTab: {
            screens: {
              HomeDashboard: 'home',
              News: 'news',
              PlayerDetails: 'player/:playerId',
            },
          },
          MatchesTab: {
            screens: {
              MatchesHome: 'matches',
              MatchDetails: 'match/:matchId',
            },
          },
          PlayersTab: {
            screens: {
              PlayersHome: 'players',
            },
          },
        },
      },
    },
  },
};
