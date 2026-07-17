import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';

let dbInstance: DB | null = null;

function getDb(): DB {
  if (!dbInstance) {
    dbInstance = open({ name: 'football_scores.db' });
  }
  return dbInstance;
}

/**
 * Runs all pending migrations inside individual transactions and records the
 * applied schema version in SQLite's user_version pragma. Safe to call on
 * every app launch.
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();
  const result = await db.execute('PRAGMA user_version;');
  const currentVersion = Number((result.rows?.[0] as { user_version?: number } | undefined)?.user_version ?? 0);

  for (let version = currentVersion; version < SCHEMA_VERSION; version += 1) {
    const statements = MIGRATIONS[version];
    if (!statements) {
      continue;
    }
    await db.transaction(async tx => {
      for (const statement of statements) {
        await tx.execute(statement);
      }
    });
    await db.execute(`PRAGMA user_version = ${version + 1};`);
  }
}

export async function runQuery<T = Record<string, unknown>>(
  sql: string,
  params: Scalar[] = [],
): Promise<T[]> {
  const db = getDb();
  const result = await db.execute(sql, params);
  return (result.rows as unknown as T[]) ?? [];
}

export async function runExecute(sql: string, params: Scalar[] = []): Promise<void> {
  const db = getDb();
  await db.execute(sql, params);
}

export async function runInTransaction(
  work: (execute: (sql: string, params?: Scalar[]) => Promise<void>) => Promise<void>,
): Promise<void> {
  const db = getDb();
  await db.transaction(async tx => {
    await work(async (sql, params = []) => {
      await tx.execute(sql, params);
    });
  });
}

export function resetDatabaseConnection(): void {
  dbInstance?.close();
  dbInstance = null;
}
