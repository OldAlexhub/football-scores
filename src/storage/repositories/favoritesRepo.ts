import { runExecute, runQuery } from '../db';
import { generateId } from '../../utils/id';
import type { Favorite, FavoriteEntityType } from '../../types/domain';

interface FavoriteRow {
  id: string;
  entity_type: FavoriteEntityType;
  entity_id: string;
  order_index: number;
  created_at: string;
}

function fromRow(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    order: row.order_index,
    createdAt: row.created_at,
  };
}

export async function listFavorites(entityType?: FavoriteEntityType): Promise<Favorite[]> {
  const rows = entityType
    ? await runQuery<FavoriteRow>(
        'SELECT * FROM favorites WHERE entity_type = ? ORDER BY order_index ASC',
        [entityType],
      )
    : await runQuery<FavoriteRow>('SELECT * FROM favorites ORDER BY order_index ASC');
  return rows.map(fromRow);
}

export async function isFavorite(entityType: FavoriteEntityType, entityId: string): Promise<boolean> {
  const rows = await runQuery<FavoriteRow>(
    'SELECT * FROM favorites WHERE entity_type = ? AND entity_id = ?',
    [entityType, entityId],
  );
  return rows.length > 0;
}

export async function addFavorite(entityType: FavoriteEntityType, entityId: string): Promise<Favorite> {
  const existing = await runQuery<FavoriteRow>(
    'SELECT * FROM favorites WHERE entity_type = ? AND entity_id = ?',
    [entityType, entityId],
  );
  if (existing.length > 0) {
    return fromRow(existing[0]);
  }
  const countRows = await runQuery<{ max_order: number | null }>(
    'SELECT MAX(order_index) as max_order FROM favorites WHERE entity_type = ?',
    [entityType],
  );
  const nextOrder = (countRows[0]?.max_order ?? -1) + 1;
  const id = generateId();
  const createdAt = new Date().toISOString();
  await runExecute(
    'INSERT INTO favorites (id, entity_type, entity_id, order_index, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, entityType, entityId, nextOrder, createdAt],
  );
  return { id, entityType, entityId, order: nextOrder, createdAt };
}

export async function removeFavorite(entityType: FavoriteEntityType, entityId: string): Promise<void> {
  await runExecute('DELETE FROM favorites WHERE entity_type = ? AND entity_id = ?', [
    entityType,
    entityId,
  ]);
}

export async function toggleFavorite(entityType: FavoriteEntityType, entityId: string): Promise<boolean> {
  const already = await isFavorite(entityType, entityId);
  if (already) {
    await removeFavorite(entityType, entityId);
    return false;
  }
  await addFavorite(entityType, entityId);
  return true;
}

export async function reorderFavorites(entityType: FavoriteEntityType, orderedIds: string[]): Promise<void> {
  for (let index = 0; index < orderedIds.length; index += 1) {
    await runExecute('UPDATE favorites SET order_index = ? WHERE entity_type = ? AND entity_id = ?', [
      index,
      entityType,
      orderedIds[index],
    ]);
  }
}

export async function clearFavorites(): Promise<void> {
  await runExecute('DELETE FROM favorites');
}
