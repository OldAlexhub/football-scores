import { NativeModules } from 'react-native';
import { initDatabase } from '../storage/db';
import { getPreferences } from '../storage/preferencesRepo';
import { initI18n } from '../i18n';
import { reconcileAllReminders } from './reminderService';
import { flushTelemetry, sharingAccepted } from './telemetry';

export async function backgroundReminderSync():Promise<void>{
  let success=false;
  try{
    await initDatabase();
    if(!sharingAccepted()){success=true;return;}
    await initI18n(getPreferences().language);
    await reconcileAllReminders();await flushTelemetry();success=true;
  }finally{NativeModules.FootballRuntime?.completeSync(success);}
}
