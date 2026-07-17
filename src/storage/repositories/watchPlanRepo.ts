import { runExecute, runQuery } from '../db';
import { generateId } from '../../utils/id';
import type { WatchPlanItem, WatchPriority } from '../../types/domain';

interface WatchPlanRow {
  id: string;
  match_id: string;
  priority: WatchPriority;
  watch_later: number;
  watched: number;
  notes: string;
  estimated_duration_minutes: number;
  spoiler_shield_enabled: number;
  spoiler_revealed: number;
  spoiler_revealed_permanently: number;
  manually_added: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

function fromRow(row: WatchPlanRow): WatchPlanItem {
  return {
    id: row.id,
    matchId: row.match_id,
    priority: row.priority,
    watchLater: !!row.watch_later,
    watched: !!row.watched,
    notes: row.notes,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    spoilerShieldEnabled: !!row.spoiler_shield_enabled,
    spoilerRevealed: !!row.spoiler_revealed,
    spoilerRevealedPermanently: !!row.spoiler_revealed_permanently,
    manuallyAdded: !!row.manually_added,
    order: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listWatchPlanItems(): Promise<WatchPlanItem[]> {
  const rows = await runQuery<WatchPlanRow>('SELECT * FROM watch_plan_items ORDER BY order_index ASC');
  return rows.map(fromRow);
}

export async function getWatchPlanItem(matchId: string): Promise<WatchPlanItem | null> {
  const rows = await runQuery<WatchPlanRow>('SELECT * FROM watch_plan_items WHERE match_id = ?', [matchId]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function upsertWatchPlanItem(
  matchId: string,
  patch: Partial<Omit<WatchPlanItem, 'id' | 'matchId' | 'createdAt' | 'updatedAt'>>,
  defaultSpoilerShield: boolean,
): Promise<WatchPlanItem> {
  const existing = await getWatchPlanItem(matchId);
  const now = new Date().toISOString();

  if (existing) {
    const merged: WatchPlanItem = { ...existing, ...patch, updatedAt: now };
    await runExecute(
      `UPDATE watch_plan_items SET priority = ?, watch_later = ?, watched = ?, notes = ?,
        estimated_duration_minutes = ?, spoiler_shield_enabled = ?, spoiler_revealed = ?,
        spoiler_revealed_permanently = ?, order_index = ?, updated_at = ? WHERE match_id = ?`,
      [
        merged.priority,
        merged.watchLater ? 1 : 0,
        merged.watched ? 1 : 0,
        merged.notes,
        merged.estimatedDurationMinutes,
        merged.spoilerShieldEnabled ? 1 : 0,
        merged.spoilerRevealed ? 1 : 0,
        merged.spoilerRevealedPermanently ? 1 : 0,
        merged.order,
        now,
        matchId,
      ],
    );
    return merged;
  }

  const countRows = await runQuery<{ max_order: number | null }>(
    'SELECT MAX(order_index) as max_order FROM watch_plan_items',
  );
  const item: WatchPlanItem = {
    id: generateId(),
    matchId,
    priority: patch.priority ?? 'normal',
    watchLater: patch.watchLater ?? false,
    watched: patch.watched ?? false,
    notes: patch.notes ?? '',
    estimatedDurationMinutes: patch.estimatedDurationMinutes ?? 120,
    spoilerShieldEnabled: patch.spoilerShieldEnabled ?? defaultSpoilerShield,
    spoilerRevealed: patch.spoilerRevealed ?? false,
    spoilerRevealedPermanently: patch.spoilerRevealedPermanently ?? false,
    manuallyAdded: patch.manuallyAdded ?? true,
    order: (countRows[0]?.max_order ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await runExecute(
    `INSERT INTO watch_plan_items (id, match_id, priority, watch_later, watched, notes,
      estimated_duration_minutes, spoiler_shield_enabled, spoiler_revealed,
      spoiler_revealed_permanently, manually_added, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.matchId,
      item.priority,
      item.watchLater ? 1 : 0,
      item.watched ? 1 : 0,
      item.notes,
      item.estimatedDurationMinutes,
      item.spoilerShieldEnabled ? 1 : 0,
      item.spoilerRevealed ? 1 : 0,
      item.spoilerRevealedPermanently ? 1 : 0,
      item.manuallyAdded ? 1 : 0,
      item.order,
      item.createdAt,
      item.updatedAt,
    ],
  );
  return item;
}

export async function removeWatchPlanItem(matchId: string): Promise<void> {
  await runExecute('DELETE FROM watch_plan_items WHERE match_id = ?', [matchId]);
}

export async function reorderWatchPlanItems(orderedMatchIds: string[]): Promise<void> {
  for (let index = 0; index < orderedMatchIds.length; index += 1) {
    await runExecute('UPDATE watch_plan_items SET order_index = ? WHERE match_id = ?', [
      index,
      orderedMatchIds[index],
    ]);
  }
}

export async function clearWatchPlanItems(): Promise<void> {
  await runExecute('DELETE FROM watch_plan_items');
}
