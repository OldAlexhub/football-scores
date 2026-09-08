import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { SafeBottomBar } from '../components/SafeBottomBar';
import { HomeStack } from './HomeStack';
import { MatchesStack } from './MatchesStack';
import { PlayersStack } from './PlayersStack';
import { MoreStack } from './MoreStack';
import { normalizeDefaultTab } from './defaultTab';
import type { DefaultTab } from '../types/domain';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ROUTE_FOR_DEFAULT: Record<DefaultTab, keyof MainTabParamList> = {
  home: 'HomeTab',
  matches: 'MatchesTab',
  players: 'PlayersTab',
  more: 'MoreTab',
};

export function TabNavigator({ defaultTab }: { defaultTab: DefaultTab }) {
  return (
    <Tab.Navigator
      initialRouteName={TAB_ROUTE_FOR_DEFAULT[normalizeDefaultTab(defaultTab)]}
      screenOptions={{ headerShown: false }}
      tabBar={props => <SafeBottomBar {...props} />}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="MatchesTab" component={MatchesStack} />
      <Tab.Screen name="PlayersTab" component={PlayersStack} />
      <Tab.Screen name="MoreTab" component={MoreStack} />
    </Tab.Navigator>
  );
}
