/**
 * Compass v1 · user preferences (local SQLite).
 *
 * Simple key/value store. Values are stringified — pass primitives or
 * JSON-serializable objects. Reads back typed via the caller's shape.
 */

import { exec, queryOne } from '../lib/db';

const nowISO = () => new Date().toISOString();

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  const row = await queryOne<{ value: string }>(
    'SELECT value FROM user_prefs WHERE key = ?',
    [key],
  );
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setPref<T>(key: string, value: T): Promise<void> {
  const now = nowISO();
  await exec(
    `INSERT INTO user_prefs (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), now],
  );
}

export async function deletePref(key: string): Promise<void> {
  await exec('DELETE FROM user_prefs WHERE key = ?', [key]);
}
