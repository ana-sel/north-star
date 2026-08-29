/**
 * Compass v1 · sleep data access layer (local SQLite).
 *
 * Replaces the earlier Supabase implementation. Same function names so
 * callers don't change. Every function is single-user — no user_id
 * parameter — and every write generates its own UUID + ISO timestamps.
 */

import * as Crypto from 'expo-crypto';
import { exec, query, queryOne } from '../lib/db';
import { SleepEntry } from '../types/index';

type NewSleepEntry = Omit<SleepEntry, 'id' | 'created_at' | 'updated_at' | 'user_id'>;

function nowISO(): string {
  return new Date().toISOString();
}

function computeDurationMinutes(startISO: string, endISO: string): number {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  return Math.max(0, Math.round((endMs - startMs) / 60000));
}

function rowToEntry(row: Record<string, unknown>): SleepEntry {
  return {
    id: row.id as string,
    user_id: '',
    sleep_start_utc: row.sleep_start_utc as string,
    sleep_end_utc: row.sleep_end_utc as string,
    timezone: row.timezone as string,
    duration_minutes: (row.duration_minutes as number | null) ?? null,
    note: (row.note as string | null) ?? null,
    energy: (row.energy as number | null) ?? null,
    mood: (row.mood as number | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Save a new sleep entry. */
export async function saveSleepEntry(entry: NewSleepEntry): Promise<SleepEntry> {
  const id = Crypto.randomUUID();
  const now = nowISO();
  const duration =
    entry.duration_minutes ??
    computeDurationMinutes(entry.sleep_start_utc, entry.sleep_end_utc);
  await exec(
    `INSERT INTO sleep_entries
       (id, sleep_start_utc, sleep_end_utc, timezone, duration_minutes,
        note, energy, mood, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.sleep_start_utc,
      entry.sleep_end_utc,
      entry.timezone,
      duration,
      entry.note ?? null,
      entry.energy ?? null,
      entry.mood ?? null,
      now,
      now,
    ],
  );
  const saved = await queryOne<Record<string, unknown>>(
    'SELECT * FROM sleep_entries WHERE id = ?',
    [id],
  );
  if (!saved) throw new Error('Sleep entry vanished after insert');
  return rowToEntry(saved);
}

/** Sleep entries whose start falls within the last N days (UTC). */
export async function getSleepLastDays(days: number = 7): Promise<SleepEntry[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM sleep_entries
     WHERE sleep_start_utc >= ?
     ORDER BY sleep_start_utc DESC`,
    [cutoff.toISOString()],
  );
  return rows.map(rowToEntry);
}

/** Paginated history. */
export async function getSleepHistory(
  limit: number = 50,
  offset: number = 0,
): Promise<SleepEntry[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM sleep_entries
     ORDER BY sleep_start_utc DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows.map(rowToEntry);
}

/** Return today's sleep entry if it's already logged, else null. */
export async function getTodaySleep(localDate: string): Promise<SleepEntry | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM sleep_entries
     WHERE substr(sleep_end_utc, 1, 10) = ?
     ORDER BY sleep_end_utc DESC
     LIMIT 1`,
    [localDate],
  );
  return row ? rowToEntry(row) : null;
}

/** Update an existing sleep entry. */
export async function updateSleepEntry(
  id: string,
  updates: Partial<Omit<SleepEntry, 'id' | 'user_id' | 'created_at'>>,
): Promise<SleepEntry> {
  const existing = await queryOne<Record<string, unknown>>(
    'SELECT * FROM sleep_entries WHERE id = ?',
    [id],
  );
  if (!existing) throw new Error(`Sleep entry ${id} not found`);

  const next = { ...rowToEntry(existing), ...updates, updated_at: nowISO() };
  if (updates.sleep_start_utc || updates.sleep_end_utc) {
    next.duration_minutes = computeDurationMinutes(
      next.sleep_start_utc,
      next.sleep_end_utc,
    );
  }
  await exec(
    `UPDATE sleep_entries
       SET sleep_start_utc = ?, sleep_end_utc = ?, timezone = ?,
           duration_minutes = ?, note = ?, energy = ?, mood = ?, updated_at = ?
     WHERE id = ?`,
    [
      next.sleep_start_utc,
      next.sleep_end_utc,
      next.timezone,
      next.duration_minutes,
      next.note,
      next.energy,
      next.mood,
      next.updated_at,
      id,
    ],
  );
  return next;
}

/** Delete a sleep entry. */
export async function deleteSleepEntry(id: string): Promise<void> {
  await exec('DELETE FROM sleep_entries WHERE id = ?', [id]);
}

export default {
  saveSleepEntry,
  getSleepLastDays,
  getSleepHistory,
  getTodaySleep,
  updateSleepEntry,
  deleteSleepEntry,
};
