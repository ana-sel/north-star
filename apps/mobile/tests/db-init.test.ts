jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

import * as SQLite from 'expo-sqlite';
import { _resetForTests, openDb } from '../src/lib/db';

const openDatabase = SQLite.openDatabaseAsync as jest.MockedFunction<typeof SQLite.openDatabaseAsync>;

const database = {
  execAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  closeAsync: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  openDatabase.mockResolvedValue(database as unknown as SQLite.SQLiteDatabase);
});

afterEach(async () => {
  await _resetForTests();
});

it('creates the fresh schema without dropping tables', async () => {
  database.getFirstAsync.mockResolvedValueOnce(null);

  await openDb();

  expect(database.execAsync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS sleep_entries'));
  expect(database.execAsync.mock.calls.some(([sql]) => sql.includes('DROP TABLE'))).toBe(false);
  expect(database.runAsync).toHaveBeenCalledWith(
    'INSERT INTO schema_meta (key, value) VALUES (?, ?)', ['version', 'clean-v1'],
  );
});

it('keeps a matching existing database without resetting its metadata', async () => {
  database.getFirstAsync.mockResolvedValueOnce({ name: 'schema_meta' }).mockResolvedValueOnce({ value: 'clean-v1' });

  await openDb();

  expect(database.runAsync).not.toHaveBeenCalled();
  expect(database.execAsync.mock.calls.some(([sql]) => sql.includes('DROP TABLE'))).toBe(false);
});

it('refuses an unknown schema version without deleting data', async () => {
  database.getFirstAsync.mockResolvedValueOnce({ name: 'schema_meta' }).mockResolvedValueOnce({ value: 'unknown' });

  await expect(openDb()).rejects.toThrow('Unsupported local schema version: unknown');
  expect(database.execAsync.mock.calls.some(([sql]) => sql.includes('DROP TABLE'))).toBe(false);
});