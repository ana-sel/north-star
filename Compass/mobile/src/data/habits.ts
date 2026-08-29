/**
 * Compass v1 · habits data access layer (local SQLite).
 * Full CRUD for habits + one-tap tick per day.
 */

import * as Crypto from 'expo-crypto';
import { exec, query, queryOne } from '../lib/db';

export type Ritual = 'morning' | 'evening' | 'none';
export type Cadence = 'daily' | 'weekdays' | 'custom';

export interface Habit {
  id: string;
  name: string;
  ritual: Ritual;
  icon: string | null;
  cadence: Cadence;
  days_mask: number | null;
  duration_min: number | null;
  active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewHabit = Omit<Habit, 'id' | 'active' | 'archived_at' | 'created_at' | 'updated_at'>;

const nowISO = () => new Date().toISOString();

function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    name: row.name as string,
    ritual: row.ritual as Ritual,
    icon: (row.icon as string | null) ?? null,
    cadence: row.cadence as Cadence,
    days_mask: (row.days_mask as number | null) ?? null,
    duration_min: (row.duration_min as number | null) ?? null,
    active: Boolean(row.active),
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createHabit(input: NewHabit): Promise<Habit> {
  const id = Crypto.randomUUID();
  const now = nowISO();
  await exec(
    `INSERT INTO habits
       (id, name, ritual, icon, cadence, days_mask, duration_min, active,
        archived_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
    [
      id,
      input.name,
      input.ritual,
      input.icon ?? null,
      input.cadence,
      input.days_mask ?? null,
      input.duration_min ?? null,
      now,
      now,
    ],
  );
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM habits WHERE id = ?',
    [id],
  );
  if (!row) throw new Error('Habit vanished after insert');
  return rowToHabit(row);
}

export async function listActiveHabits(ritual?: Ritual): Promise<Habit[]> {
  const rows = ritual
    ? await query<Record<string, unknown>>(
        `SELECT * FROM habits WHERE active = 1 AND ritual = ? ORDER BY created_at`,
        [ritual],
      )
    : await query<Record<string, unknown>>(
        `SELECT * FROM habits WHERE active = 1 ORDER BY ritual, created_at`,
      );
  return rows.map(rowToHabit);
}

export async function archiveHabit(id: string): Promise<void> {
  const now = nowISO();
  await exec(
    'UPDATE habits SET active = 0, archived_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id],
  );
}

/** Tick a habit for a local date. Idempotent — returns true if newly ticked. */
export async function tickHabit(
  habitId: string,
  localDate: string,
  timezone: string,
): Promise<boolean> {
  const existing = await queryOne<Record<string, unknown>>(
    'SELECT id FROM habit_completions WHERE habit_id = ? AND local_date = ?',
    [habitId, localDate],
  );
  if (existing) return false;
  await exec(
    `INSERT INTO habit_completions (id, habit_id, local_date, completed_at, timezone)
     VALUES (?, ?, ?, ?, ?)`,
    [Crypto.randomUUID(), habitId, localDate, nowISO(), timezone],
  );
  return true;
}

/** Remove today's tick (undo). */
export async function untickHabit(habitId: string, localDate: string): Promise<void> {
  await exec(
    'DELETE FROM habit_completions WHERE habit_id = ? AND local_date = ?',
    [habitId, localDate],
  );
}

export interface HabitDayStatus {
  habit: Habit;
  completed: boolean;
}

/** Every active habit + whether it's ticked for the given local date. */
export async function habitsForDate(localDate: string, ritual?: Ritual): Promise<HabitDayStatus[]> {
  const habits = await listActiveHabits(ritual);
  if (habits.length === 0) return [];
  const placeholders = habits.map(() => '?').join(',');
  const ticks = await query<{ habit_id: string }>(
    `SELECT habit_id FROM habit_completions
     WHERE local_date = ? AND habit_id IN (${placeholders})`,
    [localDate, ...habits.map((h) => h.id)],
  );
  const doneSet = new Set(ticks.map((t) => t.habit_id));
  return habits.map((h) => ({ habit: h, completed: doneSet.has(h.id) }));
}
