/**
 * Compass v1 · local SQLite database
 *
 * Single-file API used by every data/ module:
 *   - openDb()  · lazy-open the on-device DB and run migrations
 *   - query()   · typed SELECT
 *   - exec()    · INSERT / UPDATE / DELETE / DDL
 *   - wipeAll() · nukes user data (keeps schema)
 *
 * No user_id exists locally. A future opt-in cloud backup flow must preserve
 * the device database as the primary working datastore.
 */

import * as SQLite from 'expo-sqlite';
import { schemaSQL } from './schema';

const DB_NAME = 'compass.v1.db';
const SCHEMA_VERSION = 'clean-v1';

const DEV_SCHEMA_TABLES = [
  'habit_completions', 'journey_returns', 'path_returns', 'tasks', 'goals',
  'habits', 'journey_progress', 'path_progress', 'sleep_entries',
  'energy_entries', 'journal_notes', 'user_prefs', 'schema_meta',
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Lazy-open the database. Idempotent — later callers reuse the same handle.
 */
export function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;
  const promise = SQLite.openDatabaseAsync(DB_NAME).then(async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    return db;
  });
  dbPromise = promise;
  return promise;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const hasMetadata = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_meta'",
  );
  const version = hasMetadata
    ? await db.getFirstAsync<{ value: string }>('SELECT value FROM schema_meta WHERE key = ?', ['version'])
    : null;
  if (!version || version.value !== SCHEMA_VERSION) {
    const dropTables = DEV_SCHEMA_TABLES.map((table) => `DROP TABLE IF EXISTS ${table};`).join('\n');
    await db.execAsync(`PRAGMA foreign_keys = OFF; ${dropTables} PRAGMA foreign_keys = ON;`);
    await db.execAsync(schemaSQL);
    const nowISO = new Date().toISOString();
    await db.runAsync('INSERT INTO schema_meta (key, value) VALUES (?, ?)', ['version', SCHEMA_VERSION]);
    await db.runAsync('INSERT INTO schema_meta (key, value) VALUES (?, ?)', ['installed_at', nowISO]);
    return;
  }
  await db.execAsync(schemaSQL);
}

/** Typed SELECT. */
export async function query<T>(sql: string, params: SQLite.SQLiteBindValue[] = []): Promise<T[]> {
  const db = await openDb();
  return db.getAllAsync<T>(sql, params);
}

/** Typed SELECT for a single row (or null). */
export async function queryOne<T>(sql: string, params: SQLite.SQLiteBindValue[] = []): Promise<T | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<T>(sql, params);
  return row ?? null;
}

/** INSERT / UPDATE / DELETE / DDL. Returns rows-affected + lastInsertRowId. */
export async function exec(sql: string, params: SQLite.SQLiteBindValue[] = []): Promise<SQLite.SQLiteRunResult> {
  const db = await openDb();
  return db.runAsync(sql, params);
}

/**
 * Wipe every user-owned table. Schema itself is preserved so the app keeps
 * working immediately after. Called from Settings → Delete my data.
 */
export async function wipeAll(): Promise<void> {
  const db = await openDb();
  const userTables = [
    'sleep_entries',
    'habit_completions',
    'habits',
    'tasks',
    'journey_returns',
    'journey_progress',
    'user_prefs',
  ];
  await db.execAsync('BEGIN');
  try {
    for (const t of userTables) {
      await db.execAsync(`DELETE FROM ${t}`);
    }
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

/** For dev only — closes the connection and forces a fresh open. */
export async function _resetForTests(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.closeAsync();
  dbPromise = null;
}
