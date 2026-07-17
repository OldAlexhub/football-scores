/**
 * Versioned SQLite schema. Each entry in MIGRATIONS runs exactly once, in
 * order, inside a transaction. Never edit a migration that has already
 * shipped — add a new one instead, so devices upgrading from any prior
 * version replay the same deterministic steps.
 */
export const SCHEMA_VERSION = 1;

export const MIGRATIONS: string[][] = [
  // Migration 1 — initial schema
  [
    `CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(entity_type, entity_id)
    );`,
    `CREATE TABLE IF NOT EXISTS watch_plan_items (
      id TEXT PRIMARY KEY NOT NULL,
      match_id TEXT NOT NULL UNIQUE,
      priority TEXT NOT NULL,
      watch_later INTEGER NOT NULL DEFAULT 0,
      watched INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      estimated_duration_minutes INTEGER NOT NULL DEFAULT 120,
      spoiler_shield_enabled INTEGER NOT NULL DEFAULT 0,
      spoiler_revealed INTEGER NOT NULL DEFAULT 0,
      spoiler_revealed_permanently INTEGER NOT NULL DEFAULT 0,
      manually_added INTEGER NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      match_id TEXT NOT NULL,
      offset_minutes INTEGER NOT NULL,
      notification_id TEXT,
      scheduled_for_utc TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(match_id)
    );`,
    `CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY NOT NULL,
      match_id TEXT NOT NULL UNIQUE,
      outcome TEXT NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      confidence INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      locked_at_utc TEXT,
      graded_at TEXT,
      points_awarded INTEGER,
      is_exact_score INTEGER,
      is_correct_outcome INTEGER,
      competition_id TEXT,
      competition_name TEXT,
      home_team_id TEXT,
      home_team_name TEXT,
      away_team_id TEXT,
      away_team_name TEXT,
      kickoff_utc TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS provider_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      provider_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at_utc TEXT NOT NULL,
      expires_at_utc TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_watch_plan_match ON watch_plan_items(match_id);`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_match ON reminders(match_id);`,
    `CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);`,
    `CREATE INDEX IF NOT EXISTS idx_provider_cache_expiry ON provider_cache(expires_at_utc);`,
  ],
];
