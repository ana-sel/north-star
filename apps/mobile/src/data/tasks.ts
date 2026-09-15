/**
 * Compass v1 · tasks data access (local SQLite).
 * Single definition of task membership shared by Plan and Today.
 */

import * as Crypto from 'expo-crypto';
import { exec, query } from '../lib/db';

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done' | 'skipped';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

const nowISO = () => new Date().toISOString();

const SELECT_COLUMNS = 'id, title, status, due_date, completed_at, created_at';

/** Plan's full working set: every open or done task, canonical ordering. */
export async function listPlanTasks(): Promise<Task[]> {
  return query<Task>(
    `SELECT ${SELECT_COLUMNS}
       FROM tasks
      WHERE status IN ('todo','done')
      ORDER BY (status = 'done') ASC, due_date IS NULL ASC, due_date ASC, created_at ASC`,
  );
}

/** The one definition of "belongs to this day". */
export function isDueOn(task: Pick<Task, 'due_date'>, localDate: string): boolean {
  return task.due_date === localDate;
}

/** Tasks due on a local date (todo first), for Today's compact plan preview. */
export async function tasksForDate(localDate: string): Promise<Task[]> {
  return query<Task>(
    `SELECT ${SELECT_COLUMNS}
       FROM tasks
      WHERE due_date = ? AND status IN ('todo','done')
      ORDER BY (status = 'done') ASC, created_at ASC`,
    [localDate],
  );
}

export async function addTask(title: string, dueDate: string | null): Promise<void> {
  const now = nowISO();
  await exec(
    `INSERT INTO tasks (id, title, status, due_date, created_at, updated_at)
     VALUES (?, ?, 'todo', ?, ?, ?)`,
    [Crypto.randomUUID(), title, dueDate, now, now],
  );
}

export async function updateTask(
  id: string,
  updates: { title: string; due_date: string | null },
): Promise<void> {
  await exec(
    `UPDATE tasks
        SET title = ?,
            due_date = ?,
            updated_at = ?
      WHERE id = ?`,
    [updates.title, updates.due_date, nowISO(), id],
  );
}

/** Flip a task between todo and done, keeping completed_at in sync. */
export async function toggleTask(task: Pick<Task, 'id' | 'status'>): Promise<void> {
  const nextStatus = task.status === 'done' ? 'todo' : 'done';
  await exec(
    `UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    [nextStatus, nextStatus === 'done' ? nowISO() : null, nowISO(), task.id],
  );
}

export async function deleteTask(id: string): Promise<void> {
  await exec('DELETE FROM tasks WHERE id = ?', [id]);
}
