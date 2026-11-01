import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FollowingScreen } from '../screens/following/FollowingScreen';
import { PlayerDetailsScreen } from '../screens/players/PlayerDetailsScreen';
import { MatchDetailsScreen } from '../screens/shared/MatchDetailsScreen';
import type { PlayersStackParamList } from './types';

const Stack = createNativeStackNavigator<PlayersStackParamList>();

export function PlayersStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="PlayersHome" component={FollowingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlayerDetails" component={PlayerDetailsScreen} options={{ title: t('players.title') }} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{ title: t('matchDetails.title') }} />
    </Stack.Navigator>
  );
}
