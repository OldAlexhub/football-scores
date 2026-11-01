import { useEffect } from 'react';
import { preferencesStorage } from '../storage/mmkvStorage';
import { AppState, Linking, NativeModules } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { usePreferences } from './PreferencesContext';
import { useFavorites } from './FavoritesContext';
import { useReminders } from './RemindersContext';
import { flushTelemetry, installationIdentity, track } from '../services/telemetry';
import { reconcileAllReminders } from '../services/reminderService';
import { reconcileLegacyIds } from '../services/legacyMigration';
import { markNotificationEntry } from '../ads/notificationEntry';

export function ServerRuntimeEffect() {
  const {preferences,update}=usePreferences();const {favoriteTeamIds,refresh:refreshFavorites}=useFavorites();const {refresh:refreshReminders}=useReminders();
  const favorites=[...favoriteTeamIds].sort().join(',');
  useEffect(()=>{
    if(preferences.dataDisclosureVersion!==1)return;
    let alive=true;let lastSession=0;
    const sync=async()=>{
      if(Date.now()-lastSession>30*60000){track('session_start');lastSession=Date.now();}
      try{await installationIdentity();await reconcileLegacyIds();if(alive)await refreshFavorites();}catch{/* Offline fixtures and pending uploads remain available. */}
      try{await reconcileAllReminders();if(alive)await refreshReminders();}catch{track('app_error',{code:'reminder_sync_failed'});}
      await flushTelemetry();
      if(alive&&preferencesStorage.getBoolean('data_deletion_pending')) await update({dataDisclosureVersion:0});
    };
    NativeModules.FootballRuntime?.scheduleSync();void sync();
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')void sync();else void flushTelemetry();});
    const timer=setInterval(()=>{void flushTelemetry();},60000);
    return()=>{alive=false;subscription.remove();clearInterval(timer);};
  },[preferences.dataDisclosureVersion]);
  useEffect(()=>{if(preferences.dataDisclosureVersion===1)void reconcileAllReminders().then(refreshReminders).catch(()=>undefined);},[favorites,preferences.favoriteTeamReminders,preferences.notificationsEnabled,preferences.defaultReminderOffsetMinutes]);
  useEffect(()=>{
    const open=(id:unknown)=>{if(typeof id!=='string')return;markNotificationEntry();track('reminder_opened',{entityId:id});void Linking.openURL(`footballscores://match/${encodeURIComponent(id)}`);};
    void notifee.getInitialNotification().then(event=>{if(event)open(event.notification.data?.matchId);});
    return notifee.onForegroundEvent(({type,detail})=>{if(type===EventType.PRESS)open(detail.notification?.data?.matchId);});
  },[]);
  return null;
}
