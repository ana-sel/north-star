jest.mock('../src/lib/db', () => ({ openDb: jest.fn() }));

import { openDb } from '../src/lib/db';
import { exportBackupSnapshot, parseBackupSnapshot, restoreBackupSnapshot } from '../src/data/backup';

const transaction = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
};
const database = {
  withExclusiveTransactionAsync: jest.fn(async (task: (tx: typeof transaction) => Promise<void>) => task(transaction)),
};

beforeEach(() => {
  jest.clearAllMocks();
  (openDb as jest.Mock).mockResolvedValue(database);
  transaction.getAllAsync.mockImplementation(async () => []);
  transaction.getFirstAsync.mockResolvedValue({ count: 0 });
});

it('exports every local user-data table in one snapshot', async () => {
  const snapshot = await exportBackupSnapshot();

  expect(Object.keys(snapshot.tables)).toEqual([
    'sleep_entries', 'habits', 'habit_completions', 'journey_progress', 'journey_returns', 'user_prefs',
  ]);
  expect(snapshot.schema_version).toBe('clean-v1');
  expect(transaction.getAllAsync).toHaveBeenCalledTimes(6);
});

it('refuses malformed and unsupported backups before touching SQLite', async () => {
  await expect(restoreBackupSnapshot({ format_version: 2 })).rejects.toThrow('Unsupported backup');
  expect(openDb).not.toHaveBeenCalled();
});

it('restores into a clean database in dependency order', async () => {
  const snapshot = await exportBackupSnapshot();
  snapshot.tables.habits.push({ id: 'h1', name: 'Water', ritual: 'morning', icon: null, cadence: 'daily', days_mask: null, duration_min: null, active: 1, archived_at: null, created_at: 'now', updated_at: 'now' });
  snapshot.tables.habit_completions.push({ id: 'c1', habit_id: 'h1', local_date: '2026-09-30', completed_at: 'now', timezone: 'UTC' });

  await restoreBackupSnapshot(snapshot);

  expect(transaction.runAsync.mock.calls.map(([sql]) => sql)).toEqual([
    expect.stringContaining('INSERT INTO habits'),
    expect.stringContaining('INSERT INTO habit_completions'),
  ]);
});

it('never overwrites local records during restore', async () => {
  const snapshot = await exportBackupSnapshot();
  transaction.getFirstAsync.mockResolvedValueOnce({ count: 1 });

  await expect(restoreBackupSnapshot(snapshot)).rejects.toThrow('Restore requires an empty Compass database');
  expect(transaction.runAsync).not.toHaveBeenCalled();
});

it('rejects backup rows with missing columns', async () => {
  const snapshot = await exportBackupSnapshot();
  snapshot.tables.user_prefs.push({ key: 'sleep-target', value: '{}' } as never);
  expect(() => parseBackupSnapshot(snapshot)).toThrow('Invalid backup table: user_prefs');
});