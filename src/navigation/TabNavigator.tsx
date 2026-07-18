import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { SafeBottomBar } from '../components/SafeBottomBar';
import { MatchesStack } from './MatchesStack';
import { InsightsStack } from './InsightsStack';
import { MoreStack } from './MoreStack';
import { NewsScreen } from '../screens/news/NewsScreen';
import type { DefaultTab } from '../types/domain';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ROUTE_FOR_DEFAULT: Record<DefaultTab, keyof MainTabParamList> = {
  matches: 'MatchesTab',
  matchday: 'MatchesTab',
  predict: 'MatchesTab',
  insights: 'InsightsTab',
  more: 'MoreTab',
};

export function TabNavigator({ defaultTab }: { defaultTab: DefaultTab }) {
  return (
    <Tab.Navigator
      initialRouteName={TAB_ROUTE_FOR_DEFAULT[defaultTab]}
      screenOptions={{ headerShown: false }}
      tabBar={props => <SafeBottomBar {...props} />}
    >
      <Tab.Screen name="MatchesTab" component={MatchesStack} />
      <Tab.Screen name="InsightsTab" component={InsightsStack} />
      <Tab.Screen name="NewsTab" component={NewsScreen} />
      <Tab.Screen name="MoreTab" component={MoreStack} />
    </Tab.Navigator>
  );
}
