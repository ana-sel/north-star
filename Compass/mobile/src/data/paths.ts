/**
 * Compass v1 · paths data access layer (local SQLite).
 *
 * The 41 quality definitions live in features/paths/pathsContent.ts (bundled).
 * This module stores only user *engagement*: which paths are active, which
 * camp they're at, and every practice tick (`path_returns`).
 */

import * as Crypto from 'expo-crypto';
import { exec, query, queryOne } from '../lib/db';

export type PathStatus = 'active' | 'seeded' | 'integrated' | 'resting';

export interface PathProgress {
  path_id: string;
  status: PathStatus;
  current_camp: 1 | 2 | 3;
  started_at: string;
  camp1_closed_at: string | null;
  camp2_closed_at: string | null;
  camp3_closed_at: string | null;
  claimed_at: string | null;
  notes: string | null;
  updated_at: string;
}

export interface PathReturn {
  id: string;
  path_id: string;
  local_date: string;
  logged_at: string;
  timezone: string;
  camp_at_return: 1 | 2 | 3;
  note: string | null;
}

const nowISO = () => new Date().toISOString();

function rowToProgress(row: Record<string, unknown>): PathProgress {
  return {
    path_id: row.path_id as string,
    status: row.status as PathStatus,
    current_camp: row.current_camp as 1 | 2 | 3,
    started_at: row.started_at as string,
    camp1_closed_at: (row.camp1_closed_at as string | null) ?? null,
    camp2_closed_at: (row.camp2_closed_at as string | null) ?? null,
    camp3_closed_at: (row.camp3_closed_at as string | null) ?? null,
    claimed_at: (row.claimed_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    updated_at: row.updated_at as string,
  };
}

/** Every path the user has started, seeded, or integrated. */
export async function listAllProgress(): Promise<PathProgress[]> {
  const rows = await query<Record<string, unknown>>('SELECT * FROM path_progress ORDER BY updated_at DESC');
  return rows.map(rowToProgress);
}

export async function listActivePaths(): Promise<PathProgress[]> {
  const rows = await query<Record<string, unknown>>(
    "SELECT * FROM path_progress WHERE status = 'active' ORDER BY started_at",
  );
  return rows.map(rowToProgress);
}

export async function getProgress(pathId: string): Promise<PathProgress | null> {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM path_progress WHERE path_id = ?',
    [pathId],
  );
  return row ? rowToProgress(row) : null;
}

/** Start walking a path (idempotent — becomes active if seeded before). */
export async function startPath(pathId: string): Promise<PathProgress> {
  const existing = await getProgress(pathId);
  const now = nowISO();
  if (existing) {
    await exec(
      `UPDATE path_progress
         SET status = 'active', updated_at = ?
         WHERE path_id = ?`,
      [now, pathId],
    );
  } else {
    await exec(
      `INSERT INTO path_progress
         (path_id, status, current_camp, started_at, updated_at)
       VALUES (?, 'active', 1, ?, ?)`,
      [pathId, now, now],
    );
  }
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM path_progress WHERE path_id = ?',
    [pathId],
  );
  return rowToProgress(row!);
}

/** Save as a seed (noticed, not committed). */
export async function seedPath(pathId: string): Promise<PathProgress> {
  const now = nowISO();
  await exec(
    `INSERT INTO path_progress (path_id, status, current_camp, started_at, updated_at)
     VALUES (?, 'seeded', 1, ?, ?)
     ON CONFLICT(path_id) DO UPDATE SET status = 'seeded', updated_at = excluded.updated_at`,
    [pathId, now, now],
  );
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM path_progress WHERE path_id = ?',
    [pathId],
  );
  return rowToProgress(row!);
}

/** Log a practice tick — one per day per path. Returns true if newly logged. */
export async function logReturn(
  pathId: string,
  localDate: string,
  timezone: string,
  campAtReturn: 1 | 2 | 3,
  note?: string,
): Promise<boolean> {
  const existing = await queryOne<Record<string, unknown>>(
    'SELECT id FROM path_returns WHERE path_id = ? AND local_date = ?',
    [pathId, localDate],
  );
  if (existing) return false;
  await exec(
    `INSERT INTO path_returns
       (id, path_id, local_date, logged_at, timezone, camp_at_return, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [Crypto.randomUUID(), pathId, localDate, nowISO(), timezone, campAtReturn, note ?? null],
  );
  return true;
}

/** Recent returns within the trail window (default 14 days). */
export async function recentReturns(pathId: string, windowDays = 14): Promise<PathReturn[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM path_returns
     WHERE path_id = ? AND local_date >= ?
     ORDER BY local_date DESC`,
    [pathId, cutoffDate],
  );
  return rows.map((r) => ({
    id: r.id as string,
    path_id: r.path_id as string,
    local_date: r.local_date as string,
    logged_at: r.logged_at as string,
    timezone: r.timezone as string,
    camp_at_return: r.camp_at_return as 1 | 2 | 3,
    note: (r.note as string | null) ?? null,
  }));
}

/** User claims the path is integrated (permanent, gold). */
export async function claimIntegrated(pathId: string): Promise<PathProgress> {
  const now = nowISO();
  await exec(
    `UPDATE path_progress
       SET status = 'integrated', claimed_at = ?, updated_at = ?
       WHERE path_id = ?`,
    [now, now, pathId],
  );
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM path_progress WHERE path_id = ?',
    [pathId],
  );
  if (!row) throw new Error(`Path ${pathId} not found to claim`);
  return rowToProgress(row);
}
