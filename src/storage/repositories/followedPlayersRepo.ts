import { runExecute, runQuery } from '../db';
import type { FollowedPlayerMeta } from '../../types/domain';

interface Row {
  player_id: string;
  name: string;
  photo_url: string | null;
  position: string | null;
  nationality: string | null;
  club_name: string | null;
  club_team_id: string | null;
  updated_at: string;
}

function fromRow(row: Row): FollowedPlayerMeta {
  return {
    playerId: row.player_id,
    name: row.name,
    photoUrl: row.photo_url,
    position: row.position,
    nationality: row.nationality,
    clubName: row.club_name,
    clubTeamId: row.club_team_id,
    updatedAt: row.updated_at,
  };
}

export async function listPlayerMeta(): Promise<FollowedPlayerMeta[]> {
  const rows = await runQuery<Row>('SELECT * FROM followed_player_meta ORDER BY name COLLATE NOCASE ASC');
  return rows.map(fromRow);
}

export async function getPlayerMeta(playerId: string): Promise<FollowedPlayerMeta | null> {
  const rows = await runQuery<Row>('SELECT * FROM followed_player_meta WHERE player_id = ?', [playerId]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function upsertPlayerMeta(meta: Omit<FollowedPlayerMeta, 'updatedAt'>): Promise<void> {
  await runExecute(
    `INSERT INTO followed_player_meta (player_id, name, photo_url, position, nationality, club_name, club_team_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET name = excluded.name, photo_url = excluded.photo_url,
       position = excluded.position, nationality = excluded.nationality, club_name = excluded.club_name,
       club_team_id = excluded.club_team_id, updated_at = excluded.updated_at`,
    [
      meta.playerId, meta.name, meta.photoUrl, meta.position, meta.nationality,
      meta.clubName, meta.clubTeamId, new Date().toISOString(),
    ],
  );
}

export async function deletePlayerMeta(playerId: string): Promise<void> {
  await runExecute('DELETE FROM followed_player_meta WHERE player_id = ?', [playerId]);
}

export async function clearPlayerMeta(): Promise<void> {
  await runExecute('DELETE FROM followed_player_meta');
}
