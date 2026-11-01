import notifee from '@notifee/react-native';
import i18n from '../i18n';
import { getReminder, listReminders, removeReminder, upsertReminder } from '../storage/repositories/remindersRepo';
import { listFavorites } from '../storage/repositories/favoritesRepo';
import { runExecute, runQuery } from '../storage/db';
import { getPreferences, updatePreferences } from '../storage/preferencesRepo';
import { preferencesStorage } from '../storage/mmkvStorage';
import { fetchMatches, resolveMatchById } from '../providers/providerManager';
import type { Match, Reminder } from '../types/domain';
import { cancelTriggerNotification, hasNotificationPermission, requestNotificationPermission, scheduleTriggerNotification } from './notifications';
import { planReminders, type ReminderIntent } from './reminderPlanner';
import { track } from './telemetry';

export const REMINDER_OFFSET_OPTIONS = [1440,120,60,30,15,10,0] as const;
let running: Promise<void> | null = null;
async function schedule(match: Match, offsetMinutes: number): Promise<Reminder> {
  const triggerAtUtc = new Date(Date.parse(match.kickoffUtc!) - offsetMinutes*60000).toISOString();
  const notificationId = await scheduleTriggerNotification({matchId:match.id,title:`${match.homeTeamName} · ${match.awayTeamName}`,body:i18n.t('makeover.kickoffReminder',{minutes:offsetMinutes}),triggerAtUtc});
  const result=await upsertReminder({matchId:match.id,offsetMinutes,notificationId,scheduledForUtc:notificationId?triggerAtUtc:null,status:notificationId?'scheduled':'needs_reschedule'});
  if(notificationId)track('reminder_scheduled',{entityId:match.id});return result;
}
export async function setMatchReminder(match: Match, offsetMinutes: number): Promise<Reminder> {
  const granted=await hasNotificationPermission()||await requestNotificationPermission();
  await runExecute("INSERT INTO reminder_rules(match_id,origin,disabled) VALUES(?,'manual',0) ON CONFLICT(match_id) DO UPDATE SET origin='manual',disabled=0",[match.id]);
  updatePreferences({notificationsEnabled:granted});
  await upsertReminder({matchId:match.id,offsetMinutes,notificationId:null,scheduledForUtc:null,status:'needs_reschedule'});
  await reconcileAllReminders([match]);
  return (await getReminder(match.id))!;
}
export async function cancelMatchReminder(matchId:string):Promise<void>{
  const existing=await getReminder(matchId);await cancelTriggerNotification(existing?.notificationId??null);
  await runExecute("INSERT INTO reminder_rules(match_id,origin,disabled) VALUES(?,'manual',1) ON CONFLICT(match_id) DO UPDATE SET disabled=1",[matchId]);
  await removeReminder(matchId);track('reminder_cancelled',{entityId:matchId});
}
export async function reconcileAllReminders(extra:Match[]=[]):Promise<void>{
  if(running){await running;if(extra.length)return reconcileAllReminders(extra);return;}
  running=(async()=>{
    const prefs=getPreferences();const existing=await listReminders();
    if(!prefs.notificationsEnabled||!await hasNotificationPermission()){
      await notifee.cancelTriggerNotifications();
      for(const r of existing)await upsertReminder({...r,notificationId:null,scheduledForUtc:null,status:'needs_reschedule'});
      return;
    }
    const from=new Date(),to=new Date(Date.now()+14*86400000);
    const result=await fetchMatches({dateFromUtc:from.toISOString(),dateToUtc:to.toISOString()});
    const matches=new Map([...result.data,...extra].map(m=>[m.id,m]));
    // Preserve existing reminders if the server is unavailable; never cancel solely because a refresh failed.
    for(const r of existing)if(!matches.has(r.matchId)){const match=await resolveMatchById(r.matchId);if(match)matches.set(match.id,match);}
    const rules=await runQuery<{match_id:string;origin:'manual'|'favorite';disabled:number}>('SELECT * FROM reminder_rules');
    const ruleMap=new Map(rules.map(r=>[r.match_id,r]));
    const teams=new Set((await listFavorites('team')).map(f=>f.entityId));
    const intents:ReminderIntent[]=[];
    for(const match of matches.values()){
      const rule=ruleMap.get(match.id);if(rule?.disabled)continue;
      const previous=existing.find(r=>r.matchId===match.id);
      const manual=rule?.origin==='manual'||(previous&&!rule);
      const favorite=!!prefs.favoriteTeamReminders&&(teams.has(match.homeTeamId)||teams.has(match.awayTeamId));
      if(manual||favorite)intents.push({match,offsetMinutes:manual&&previous?previous.offsetMinutes:prefs.defaultReminderOffsetMinutes,origin:manual?'manual':'favorite'});
    }
    const plan=planReminders(intents,Date.now());const desired=new Set(plan.map(p=>`reminder-${p.match.id}`));
    const active=await notifee.getTriggerNotificationIds();
    for(const id of active){
      if(!id.startsWith('reminder-')||desired.has(id))continue;
      const matchId=id.slice(9);
      if(result.errorMessage&&!matches.has(matchId))continue;
      await cancelTriggerNotification(id);
      const r=existing.find(e=>e.matchId===matchId);if(r)await upsertReminder({...r,notificationId:null,scheduledForUtc:null,status:'needs_reschedule'});
    }
    let slots=40-(await notifee.getTriggerNotificationIds()).filter(id=>!desired.has(id)).length;
    for(const intent of plan){
      if(slots--<=0)break;
      const {match,offsetMinutes,origin}=intent;
      const previous=existing.find(r=>r.matchId===match.id);
      const trigger=new Date(Date.parse(match.kickoffUtc!)-offsetMinutes*60000).toISOString();
      if(previous?.scheduledForUtc===trigger&&active.includes(`reminder-${match.id}`))continue;
      try{await schedule(match,offsetMinutes);await runExecute('INSERT OR IGNORE INTO reminder_rules(match_id,origin,disabled) VALUES(?,?,0)',[match.id,origin]);}
      catch{track('reminder_failed',{entityId:match.id,code:'schedule_failed'});}
    }
    preferencesStorage.set('reminder_last_sync',new Date().toISOString());
    preferencesStorage.set('reminder_sync_stale',result.isStale);
  })().finally(()=>{running=null;});return running;
}
export async function reconcileReminderForMatch(match:Match):Promise<void>{await reconcileAllReminders([match]);}
