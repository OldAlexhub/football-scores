import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {MatchdayStackParamList} from './types';
import {MatchdayHomeScreen} from '../screens/matchday/MatchdayHomeScreen';
import {WeekendPlannerScreen} from '../screens/matchday/WeekendPlannerScreen';
import {ClashDetailsScreen} from '../screens/matchday/ClashDetailsScreen';
import {ReminderEditorScreen} from '../screens/matchday/ReminderEditorScreen';
import {MatchDetailsScreen} from '../screens/shared/MatchDetailsScreen';
import {ExportPreviewScreen} from '../screens/shared/ExportPreviewScreen';
const Stack=createNativeStackNavigator<MatchdayStackParamList>();
export function MatchdayToolsStack(){const {t}=useTranslation();return <Stack.Navigator><Stack.Screen name="MatchdayHome" component={MatchdayHomeScreen} options={{title:t('makeover.planner')}}/><Stack.Screen name="WeekendPlanner" component={WeekendPlannerScreen} options={{title:t('makeover.planner')}}/><Stack.Screen name="ClashDetails" component={ClashDetailsScreen}/><Stack.Screen name="ReminderEditor" component={ReminderEditorScreen}/><Stack.Screen name="MatchDetails" component={MatchDetailsScreen}/><Stack.Screen name="ExportPreview" component={ExportPreviewScreen}/></Stack.Navigator>;}
