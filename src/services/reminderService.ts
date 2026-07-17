import i18n from '../i18n';
import { getReminder, removeReminder, upsertReminder } from '../storage/repositories/remindersRepo';
import type { Match, Reminder } from '../types/domain';
import { cancelTriggerNotification, hasNotificationPermission, requestNotificationPermission, scheduleTriggerNotification } from './notifications';

export const REMINDER_OFFSET_OPTIONS = [1440, 120, 60, 30, 15, 10, 0] as const;

function reminderTitle(): string {
  return i18n.t('common.appName');
}

function reminderBody(): string {
  return i18n.t('spoiler.notificationSafeBody');
}

export async function setMatchReminder(match: Match, offsetMinutes: number): Promise<Reminder> {
  const granted = (await hasNotificationPermission()) || (await requestNotificationPermission());
  const existing = await getReminder(match.id);
  if (existing?.notificationId) {
    await cancelTriggerNotification(existing.notificationId);
  }

  if (!granted) {
    return upsertReminder({
      matchId: match.id,
      offsetMinutes,
      notificationId: null,
      scheduledForUtc: null,
      status: 'needs_reschedule',
    });
  }

  if (match.kickoffUnknown || !match.kickoffUtc) {
    return upsertReminder({
      matchId: match.id,
      offsetMinutes,
      notificationId: null,
      scheduledForUtc: null,
      status: 'needs_reschedule',
    });
  }

  const triggerAtUtc = new Date(new Date(match.kickoffUtc).getTime() - offsetMinutes * 60000).toISOString();
  const notificationId = await scheduleTriggerNotification({
    matchId: match.id,
    title: reminderTitle(),
    body: reminderBody(),
    triggerAtUtc,
  });

  return upsertReminder({
    matchId: match.id,
    offsetMinutes,
    notificationId,
    scheduledForUtc: notificationId ? triggerAtUtc : null,
    status: notificationId ? 'scheduled' : 'needs_reschedule',
  });
}

export async function cancelMatchReminder(matchId: string): Promise<void> {
  const existing = await getReminder(matchId);
  if (existing?.notificationId) {
    await cancelTriggerNotification(existing.notificationId);
  }
  await removeReminder(matchId);
}

/**
 * Called whenever fresh match data is fetched. If a reminder exists for this
 * match and the kickoff time has moved, cancels the stale notification and
 * schedules a new one preserving the user's original offset. If the match
 * became postponed with no replacement time, marks the reminder as needing
 * rescheduling instead of silently dropping it.
 */
export async function reconcileReminderForMatch(match: Match): Promise<void> {
  const existing = await getReminder(match.id);
  if (!existing || existing.status === 'cancelled') {
    return;
  }

  if (match.status === 'postponed' && (match.kickoffUnknown || !match.kickoffUtc)) {
    if (existing.notificationId) {
      await cancelTriggerNotification(existing.notificationId);
    }
    await upsertReminder({
      matchId: match.id,
      offsetMinutes: existing.offsetMinutes,
      notificationId: null,
      scheduledForUtc: null,
      status: 'needs_reschedule',
    });
    return;
  }

  if (match.status === 'cancelled') {
    await cancelMatchReminder(match.id);
    return;
  }

  if (!match.kickoffUnknown && match.kickoffUtc) {
    const desiredTrigger = new Date(new Date(match.kickoffUtc).getTime() - existing.offsetMinutes * 60000).toISOString();
    if (desiredTrigger !== existing.scheduledForUtc) {
      await setMatchReminder(match, existing.offsetMinutes);
    }
  }
}
