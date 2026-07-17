import { runExecute, runQuery } from '../db';
import { generateId } from '../../utils/id';
import type { Reminder, ReminderStatus } from '../../types/domain';

interface ReminderRow {
  id: string;
  match_id: string;
  offset_minutes: number;
  notification_id: string | null;
  scheduled_for_utc: string | null;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
}

function fromRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    matchId: row.match_id,
    offsetMinutes: row.offset_minutes,
    notificationId: row.notification_id,
    scheduledForUtc: row.scheduled_for_utc,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReminders(): Promise<Reminder[]> {
  const rows = await runQuery<ReminderRow>('SELECT * FROM reminders ORDER BY scheduled_for_utc ASC');
  return rows.map(fromRow);
}

export async function getReminder(matchId: string): Promise<Reminder | null> {
  const rows = await runQuery<ReminderRow>('SELECT * FROM reminders WHERE match_id = ?', [matchId]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function upsertReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reminder> {
  const existing = await getReminder(reminder.matchId);
  const now = new Date().toISOString();

  if (existing) {
    const merged: Reminder = { ...existing, ...reminder, updatedAt: now };
    await runExecute(
      `UPDATE reminders SET offset_minutes = ?, notification_id = ?, scheduled_for_utc = ?,
        status = ?, updated_at = ? WHERE match_id = ?`,
      [merged.offsetMinutes, merged.notificationId, merged.scheduledForUtc, merged.status, now, reminder.matchId],
    );
    return merged;
  }

  const created: Reminder = { id: generateId(), createdAt: now, updatedAt: now, ...reminder };
  await runExecute(
    `INSERT INTO reminders (id, match_id, offset_minutes, notification_id, scheduled_for_utc,
      status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      created.id,
      created.matchId,
      created.offsetMinutes,
      created.notificationId,
      created.scheduledForUtc,
      created.status,
      created.createdAt,
      created.updatedAt,
    ],
  );
  return created;
}

export async function removeReminder(matchId: string): Promise<void> {
  await runExecute('DELETE FROM reminders WHERE match_id = ?', [matchId]);
}

export async function clearReminders(): Promise<void> {
  await runExecute('DELETE FROM reminders');
}
