/**
 * Compass v1 · paths data access layer (local SQLite).
 *
 * The 41 quality definitions live in features/paths/pathsContent.ts (bundled).
 * This module stores only user *engagement*: which paths are active, which
 * camp they're at, and every practice tick in the generic journey tables.
 */

import * as Crypto from 'expo-crypto';
import { exec, query, queryOne } from '../lib/db';
import { ACTIVE_JOURNEY_CAP, canResumeJourney, canStartJourney, DOING_RETURNS, journeyCampForReturns, REFLECTION_RETURNS, WATCHING_RETURNS } from './journeyRules';
import { localDateOffset } from '../lib/time';

export { ACTIVE_JOURNEY_CAP, canResumeJourney, canStartJourney, DOING_RETURNS, journeyCampForReturns, REFLECTION_RETURNS, WATCHING_RETURNS } from './journeyRules';

export type PathStatus = 'active' | 'seeded' | 'integrated' | 'resting';

export interface PathProgress {
  journey_type: 'path' | 'foundation';
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
  journey_type: 'path' | 'foundation';
  path_id: string;
  local_date: string;
  logged_at: string;
  timezone: string;
  camp_at_return: 1 | 2 | 3;
  note: string | null;
}

const nowISO = () => new Date().toISOString();

function journeyParts(journeyId: string): { type: 'path' | 'foundation'; id: string } {
  return journeyId.startsWith('foundation:')
    ? { type: 'foundation', id: journeyId.slice('foundation:'.length) }
    : { type: 'path', id: journeyId };
}

const journeyListeners = new Set<() => void>();

export function subscribeToJourneyChanges(listener: () => void): () => void {
  journeyListeners.add(listener);
  return () => journeyListeners.delete(listener);
}

function notifyJourneyChanged(): void {
  journeyListeners.forEach((listener) => listener());
}

function rowToProgress(row: Record<string, unknown>): PathProgress {
  return {
    journey_type: row.journey_type as 'path' | 'foundation',
    path_id: row.journey_type === 'foundation' ? `foundation:${row.journey_id as string}` : row.journey_id as string,
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

/** Every journey the user has started, seeded, or integrated. */
export async function listAllProgress(): Promise<PathProgress[]> {
  const rows = await query<Record<string, unknown>>('SELECT * FROM journey_progress ORDER BY updated_at DESC');
  return rows.map(rowToProgress);
}

export async function listActivePaths(): Promise<PathProgress[]> {
  const rows = await query<Record<string, unknown>>(
    "SELECT * FROM journey_progress WHERE status = 'active' AND journey_type = 'path' ORDER BY started_at",
  );
  return rows.map(rowToProgress);
}

/** Active Paths and Foundations share this single journey pool and cap. */
export async function listActiveJourneys(): Promise<PathProgress[]> {
  const rows = await query<Record<string, unknown>>(
    "SELECT * FROM journey_progress WHERE status = 'active' ORDER BY started_at",
  );
  return rows.map(rowToProgress);
}

export async function getProgress(pathId: string): Promise<PathProgress | null> {
  const journey = journeyParts(pathId);
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM journey_progress WHERE journey_type = ? AND journey_id = ?',
    [journey.type, journey.id],
  );
  return row ? rowToProgress(row) : null;
}

/** Start walking a path (idempotent — becomes active if seeded before). */
export async function startPath(pathId: string): Promise<PathProgress> {
  const existing = await getProgress(pathId);
  if (!existing || existing.status !== 'active') {
    const active = await listActiveJourneys();
    const canActivate = existing?.status === 'resting'
      ? canResumeJourney(active.length)
      : canStartJourney(active.length);
    if (!canActivate) {
      throw new Error(`You can walk up to ${ACTIVE_JOURNEY_CAP} journeys at once. Pause one before starting another.`);
    }
  }
  const now = nowISO();
    const journey = journeyParts(pathId);
  if (existing) {
    await exec(
      `UPDATE journey_progress
         SET status = 'active', updated_at = ?
        WHERE journey_type = ? AND journey_id = ?`,
      [now, journey.type, journey.id],
    );
  } else {
    await exec(
      `INSERT INTO journey_progress
         (journey_type, journey_id, status, current_camp, started_at, updated_at)
       VALUES (?, ?, 'active', 1, ?, ?)`,
      [journey.type, journey.id, now, now],
    );
  }
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM journey_progress WHERE journey_type = ? AND journey_id = ?',
    [journey.type, journey.id],
  );
  const progress = rowToProgress(row!);
  notifyJourneyChanged();
  return progress;
}

/** Start any V1 journey. Foundation IDs use the `foundation:` namespace. */
export const startJourney = startPath;

/** Pause a journey without losing its returns or current camp. */
export async function pauseJourney(journeyId: string): Promise<PathProgress> {
  const now = nowISO();
  const journey = journeyParts(journeyId);
  await exec(
    `UPDATE journey_progress SET status = 'resting', updated_at = ? WHERE journey_type = ? AND journey_id = ?`,
    [now, journey.type, journey.id],
  );
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM journey_progress WHERE journey_type = ? AND journey_id = ?',
    [journey.type, journey.id],
  );
  if (!row) throw new Error(`Journey ${journeyId} not found to pause`);
  const progress = rowToProgress(row);
  notifyJourneyChanged();
  return progress;
}

/** Save as a seed (noticed, not committed). */
export async function seedPath(pathId: string): Promise<PathProgress> {
  const now = nowISO();
  const journey = journeyParts(pathId);
  await exec(
    `INSERT INTO journey_progress (journey_type, journey_id, status, current_camp, started_at, updated_at)
     VALUES (?, ?, 'seeded', 1, ?, ?)
     ON CONFLICT(journey_type, journey_id) DO UPDATE SET status = 'seeded', updated_at = excluded.updated_at`,
    [journey.type, journey.id, now, now],
  );
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM journey_progress WHERE journey_type = ? AND journey_id = ?',
    [journey.type, journey.id],
  );
  const progress = rowToProgress(row!);
  notifyJourneyChanged();
  return progress;
}

/** Log a practice tick — one per local day per journey. Returns true if newly logged. */
export async function logReturn(
  pathId: string,
  localDate: string,
  timezone: string,
  campAtReturn: 1 | 2 | 3,
  note?: string,
): Promise<boolean> {
  const journey = journeyParts(pathId);
  const existing = await queryOne<Record<string, unknown>>(
    'SELECT id FROM journey_returns WHERE journey_type = ? AND journey_id = ? AND local_date = ?',
    [journey.type, journey.id, localDate],
  );
  if (existing) return false;
  await exec(
    `INSERT INTO journey_returns
       (id, journey_type, journey_id, local_date, logged_at, timezone, camp_at_return, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [Crypto.randomUUID(), journey.type, journey.id, localDate, nowISO(), timezone, campAtReturn, note ?? null],
  );
  const returnCount = await countReturns(pathId);
  const nextCamp = journeyCampForReturns(returnCount);
  await exec(
    `UPDATE journey_progress
       SET current_camp = ?,
           camp1_closed_at = CASE WHEN ? >= ? THEN COALESCE(camp1_closed_at, ?) ELSE camp1_closed_at END,
           camp2_closed_at = CASE WHEN ? >= ? THEN COALESCE(camp2_closed_at, ?) ELSE camp2_closed_at END,
           updated_at = ?
    WHERE journey_type = ? AND journey_id = ?`,
      [nextCamp, returnCount, WATCHING_RETURNS, nowISO(), returnCount, DOING_RETURNS, nowISO(), nowISO(), journey.type, journey.id],
  );
  notifyJourneyChanged();
  return true;
}

export async function countReturns(pathId: string): Promise<number> {
  const journey = journeyParts(pathId);
  const row = await queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM journey_returns WHERE journey_type = ? AND journey_id = ?',
    [journey.type, journey.id],
  );
  return row?.count ?? 0;
}

/** Recent returns within the trail window (default 14 days). */
export async function recentReturns(pathId: string, windowDays = 14): Promise<PathReturn[]> {
  const journey = journeyParts(pathId);
  const cutoffDate = localDateOffset(-(windowDays - 1));
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM journey_returns
     WHERE journey_type = ? AND journey_id = ? AND local_date >= ?
     ORDER BY local_date DESC`,
    [journey.type, journey.id, cutoffDate],
  );
  return rows.map((r) => ({
    id: r.id as string,
    journey_type: r.journey_type as 'path' | 'foundation',
    path_id: r.journey_type === 'foundation' ? `foundation:${r.journey_id as string}` : r.journey_id as string,
    local_date: r.local_date as string,
    logged_at: r.logged_at as string,
    timezone: r.timezone as string,
    camp_at_return: r.camp_at_return as 1 | 2 | 3,
    note: (r.note as string | null) ?? null,
  }));
}

/** User claims the path is integrated (permanent, gold). */
export async function claimIntegrated(pathId: string): Promise<PathProgress> {
  const returnCount = await countReturns(pathId);
  if (returnCount < REFLECTION_RETURNS) {
    throw new Error(`Integration opens after ${REFLECTION_RETURNS} returns.`);
  }
  const now = nowISO();
  const journey = journeyParts(pathId);
  await exec(
    `UPDATE journey_progress
       SET status = 'integrated', claimed_at = ?, updated_at = ?
       WHERE journey_type = ? AND journey_id = ?`,
    [now, now, journey.type, journey.id],
  );
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM journey_progress WHERE journey_type = ? AND journey_id = ?',
    [journey.type, journey.id],
  );
  if (!row) throw new Error(`Path ${pathId} not found to claim`);
  const progress = rowToProgress(row);
  notifyJourneyChanged();
  return progress;
}
