import { openDb } from '../lib/db';

const TABLE_COLUMNS = {
  sleep_entries: ['id', 'sleep_start_utc', 'sleep_end_utc', 'timezone', 'duration_minutes', 'note', 'energy', 'mood', 'created_at', 'updated_at'],
  habits: ['id', 'name', 'ritual', 'icon', 'cadence', 'days_mask', 'duration_min', 'active', 'archived_at', 'created_at', 'updated_at'],
  habit_completions: ['id', 'habit_id', 'local_date', 'completed_at', 'timezone'],
  journey_progress: ['journey_type', 'journey_id', 'status', 'current_camp', 'started_at', 'camp1_closed_at', 'camp2_closed_at', 'camp3_closed_at', 'claimed_at', 'notes', 'updated_at'],
  journey_returns: ['id', 'journey_type', 'journey_id', 'local_date', 'logged_at', 'timezone', 'camp_at_return', 'note'],
  user_prefs: ['key', 'value', 'updated_at'],
} as const;

type Table = keyof typeof TABLE_COLUMNS;
const TABLES = Object.keys(TABLE_COLUMNS) as Table[];

export interface BackupSnapshot {
  format_version: 1;
  schema_version: 'clean-v1';
  exported_at: string;
  tables: Record<Table, Record<string, string | number | null>[]>;
}

export function parseBackupSnapshot(value: unknown): BackupSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid backup');
  const snapshot = value as Partial<BackupSnapshot>;
  if (snapshot.format_version !== 1 || snapshot.schema_version !== 'clean-v1' ||
      typeof snapshot.exported_at !== 'string' || !Number.isFinite(Date.parse(snapshot.exported_at)) ||
      !snapshot.tables || typeof snapshot.tables !== 'object' ||
      Object.keys(snapshot.tables).length !== TABLES.length) throw new Error('Unsupported backup');

  for (const table of TABLES) {
    const rows = snapshot.tables[table];
    const columns: readonly string[] = TABLE_COLUMNS[table];
    if (!Array.isArray(rows) || rows.some((row) =>
      !row || typeof row !== 'object' ||
      Object.keys(row).length !== columns.length ||
      columns.some((column) => !Object.prototype.hasOwnProperty.call(row, column) ||
        (row[column] !== null && typeof row[column] !== 'string' && typeof row[column] !== 'number'))
    )) throw new Error(`Invalid backup table: ${table}`);
  }
  return snapshot as BackupSnapshot;
}

export async function exportBackupSnapshot(): Promise<BackupSnapshot> {
  const db = await openDb();
  const tables = {} as BackupSnapshot['tables'];
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const table of TABLES) {
      tables[table] = await transaction.getAllAsync<Record<string, string | number | null>>(`SELECT * FROM ${table}`);
    }
  });
  return { format_version: 1, schema_version: 'clean-v1', exported_at: new Date().toISOString(), tables };
}

export async function restoreBackupSnapshot(value: unknown): Promise<void> {
  const snapshot = parseBackupSnapshot(value);
  const db = await openDb();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const table of TABLES) {
      const existing = await transaction.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
      if (existing?.count) throw new Error('Restore requires an empty Compass database');
    }
    for (const table of TABLES) {
      const columns: readonly string[] = TABLE_COLUMNS[table];
      const placeholders = columns.map(() => '?').join(', ');
      for (const row of snapshot.tables[table]) {
        await transaction.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          columns.map((column) => row[column]),
        );
      }
    }
  });
}