import notifee, { AndroidImportance, AuthorizationStatus, TriggerType } from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'match-reminders';

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Match reminders',
    importance: AndroidImportance.HIGH,
  });
  channelReady = true;
}

/**
 * Only prompts on Android 13+ (API 33), where POST_NOTIFICATIONS is a
 * runtime permission. Older versions grant notification access at install
 * time, so this resolves true immediately there.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version < 33) {
    return true;
  }
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version < 33) {
    return true;
  }
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export interface ScheduleReminderInput {
  matchId: string;
  title: string;
  body: string;
  triggerAtUtc: string;
}

/**
 * Schedules a spoiler-safe local trigger notification. Callers must never
 * pass a score or winner into `title`/`body` — the notification wording is
 * always generic ("Your saved match may have finished…").
 */
export async function scheduleTriggerNotification(input: ScheduleReminderInput): Promise<string | null> {
  const triggerTime = new Date(input.triggerAtUtc).getTime();
  if (triggerTime <= Date.now()) {
    return null;
  }
  await ensureChannel();
  const notificationId = `reminder-${input.matchId}`;
  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: input.title,
      body: input.body,
      android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
      data: { matchId: input.matchId },
    },
    { type: TriggerType.TIMESTAMP, timestamp: triggerTime },
  );
  return notificationId;
}

export async function cancelTriggerNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  await notifee.cancelTriggerNotification(notificationId).catch(() => undefined);
}
