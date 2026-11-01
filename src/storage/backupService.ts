import { runInTransaction, runQuery } from './db';
import { getPreferences, savePreferences } from './preferencesRepo';
import type { BackupMetadata, CompleteBackup, Favorite, FollowedPlayerMeta, Reminder, WatchPlanItem } from '../types/domain';
import type { PredictionRecord } from './repositories/predictionsRepo';

const APP_VERSION = '2.0.0';
const SCHEMA_VERSION = 3;

export async function buildCompleteBackup(): Promise<CompleteBackup> {
  const favorites = await runQuery<any>('SELECT * FROM favorites');
  const watchPlanItems = await runQuery<any>('SELECT * FROM watch_plan_items');
  const reminders = await runQuery<any>('SELECT * FROM reminders');
  const predictions = await runQuery<any>('SELECT * FROM predictions');
  const followedPlayerMetaRows = await runQuery<any>('SELECT * FROM followed_player_meta').catch(() => []);
  const preferences = getPreferences();

  const followedPlayerMeta: FollowedPlayerMeta[] = followedPlayerMetaRows.map((row: any) => ({
    playerId: row.player_id,
    name: row.name,
    photoUrl: row.photo_url ?? null,
    position: row.position ?? null,
    nationality: row.nationality ?? null,
    clubName: row.club_name ?? null,
    clubTeamId: row.club_team_id ?? null,
    updatedAt: row.updated_at,
  }));

  const metadata: BackupMetadata = {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAtUtc: new Date().toISOString(),
    recordCounts: {
      favorites: favorites.length,
      watchPlanItems: watchPlanItems.length,
      reminders: reminders.length,
      predictions: predictions.length,
      followedPlayerMeta: followedPlayerMeta.length,
    },
  };

  return {
    metadata,
    favorites: favorites.map(f=>({id:f.id,entityType:f.entity_type,entityId:f.entity_id,order:f.order_index,createdAt:f.created_at})) as Favorite[],
    watchPlanItems: watchPlanItems as WatchPlanItem[],
    reminders: reminders as Reminder[],
    predictions: predictions as PredictionRecord[],
    followedPlayerMeta,
    preferences,
    reminderRules: await runQuery('SELECT * FROM reminder_rules'),
  };
}

export interface BackupValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateBackup(candidate: unknown): BackupValidationResult {
  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, reason: 'Backup is not a valid object.' };
  }
  const backup = candidate as Partial<CompleteBackup>;
  if (!backup.metadata || typeof backup.metadata.schemaVersion !== 'number') {
    return { valid: false, reason: 'Backup metadata is missing or malformed.' };
  }
  if (backup.metadata.schemaVersion > SCHEMA_VERSION) {
    return { valid: false, reason: 'Backup was created by a newer app version.' };
  }
  if (!Array.isArray(backup.favorites) || !Array.isArray(backup.watchPlanItems) ||
      !Array.isArray(backup.reminders) || !Array.isArray(backup.predictions)) {
    return { valid: false, reason: 'Backup is missing expected data sections.' };
  }
  if (!backup.preferences || typeof backup.preferences.language !== 'string') {
    return { valid: false, reason: 'Backup preferences are missing or malformed.' };
  }
  return { valid: true };
}

/**
 * Restores a backup transactionally. If any statement fails, nothing already
 * on the device is modified (snapshot the affected tables to memory first).
 */
export async function restoreCompleteBackup(backup: CompleteBackup): Promise<void> {
  const validation = validateBackup(backup);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Invalid backup');
  }

  const currentPreferences = getPreferences();
  await runInTransaction(async runExecute => {
  const insertPlayerMeta = (m: any) => runExecute(
    `INSERT INTO followed_player_meta (player_id, name, photo_url, position, nationality, club_name, club_team_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      m.playerId ?? m.player_id, m.name, m.photoUrl ?? m.photo_url ?? null,
      m.position ?? null, m.nationality ?? null, m.clubName ?? m.club_name ?? null,
      m.clubTeamId ?? m.club_team_id ?? null, m.updatedAt ?? m.updated_at ?? new Date().toISOString(),
    ],
  );

    await runExecute('DELETE FROM favorites');
    await runExecute('DELETE FROM watch_plan_items');
    await runExecute('DELETE FROM reminders');
    await runExecute('DELETE FROM reminder_rules');
    await runExecute('DELETE FROM predictions');
    await runExecute('DELETE FROM followed_player_meta');

    for (const f of backup.favorites as any[]) {
      await runExecute(
        'INSERT INTO favorites (id, entity_type, entity_id, order_index, created_at) VALUES (?, ?, ?, ?, ?)',
        [f.id, f.entityType ?? f.entity_type, f.entityId ?? f.entity_id, f.order ?? f.order_index ?? 0, f.createdAt ?? f.created_at],
      );
    }
    for (const w of backup.watchPlanItems as any[]) {
      await runExecute(
        `INSERT INTO watch_plan_items (id, match_id, priority, watch_later, watched, notes,
          estimated_duration_minutes, spoiler_shield_enabled, spoiler_revealed,
          spoiler_revealed_permanently, manually_added, order_index, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          w.id, w.matchId ?? w.match_id, w.priority,
          (w.watchLater ?? w.watch_later) ? 1 : 0, (w.watched ?? w.watched) ? 1 : 0,
          w.notes ?? '', w.estimatedDurationMinutes ?? w.estimated_duration_minutes ?? 120,
          (w.spoilerShieldEnabled ?? w.spoiler_shield_enabled) ? 1 : 0,
          (w.spoilerRevealed ?? w.spoiler_revealed) ? 1 : 0,
          (w.spoilerRevealedPermanently ?? w.spoiler_revealed_permanently) ? 1 : 0,
          (w.manuallyAdded ?? w.manually_added) ? 1 : 0,
          w.order ?? w.order_index ?? 0, w.createdAt ?? w.created_at, w.updatedAt ?? w.updated_at,
        ],
      );
    }
    for (const r of backup.reminders as any[]) {
      await runExecute(
        `INSERT INTO reminders (id, match_id, offset_minutes, notification_id, scheduled_for_utc,
          status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id, r.matchId ?? r.match_id, r.offsetMinutes ?? r.offset_minutes,
          r.notificationId ?? r.notification_id ?? null,
          r.scheduledForUtc ?? r.scheduled_for_utc ?? null,
          r.status, r.createdAt ?? r.created_at, r.updatedAt ?? r.updated_at,
        ],
      );
    }
    for (const p of backup.predictions as any[]) {
      await runExecute(
        `INSERT INTO predictions (id, match_id, outcome, home_score, away_score, confidence, note,
          created_at, updated_at, locked_at_utc, graded_at, points_awarded, is_exact_score,
          is_correct_outcome, competition_id, competition_name, home_team_id, home_team_name,
          away_team_id, away_team_name, kickoff_utc)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, p.matchId ?? p.match_id, p.outcome, p.homeScore ?? p.home_score,
          p.awayScore ?? p.away_score, p.confidence, p.note ?? '',
          p.createdAt ?? p.created_at, p.updatedAt ?? p.updated_at,
          p.lockedAtUtc ?? p.locked_at_utc ?? null, p.gradedAt ?? p.graded_at ?? null,
          p.pointsAwarded ?? p.points_awarded ?? null,
          (p.isExactScore ?? p.is_exact_score) === null || (p.isExactScore ?? p.is_exact_score) === undefined
            ? null : (p.isExactScore ?? p.is_exact_score) ? 1 : 0,
          (p.isCorrectOutcome ?? p.is_correct_outcome) === null || (p.isCorrectOutcome ?? p.is_correct_outcome) === undefined
            ? null : (p.isCorrectOutcome ?? p.is_correct_outcome) ? 1 : 0,
          p.competitionId ?? p.competition_id ?? null, p.competitionName ?? p.competition_name ?? null,
          p.homeTeamId ?? p.home_team_id ?? null, p.homeTeamName ?? p.home_team_name ?? null,
          p.awayTeamId ?? p.away_team_id ?? null, p.awayTeamName ?? p.away_team_name ?? null,
          p.kickoffUtc ?? p.kickoff_utc ?? null,
        ],
      );
    }

    for (const m of backup.followedPlayerMeta ?? []) {
      await insertPlayerMeta(m);
    }

    if (backup.reminderRules) {
      for (const r of backup.reminderRules) await runExecute('INSERT INTO reminder_rules(match_id,origin,disabled) VALUES(?,?,?)',[r.match_id,r.origin,r.disabled]);
    } else {
      await runExecute("INSERT INTO reminder_rules(match_id,origin,disabled) SELECT match_id,'manual',0 FROM reminders");
    }
  });
  // A backup never carries consent acceptance or installation credentials to another device.
  savePreferences({...backup.preferences,dataDisclosureVersion:currentPreferences.dataDisclosureVersion});
}
