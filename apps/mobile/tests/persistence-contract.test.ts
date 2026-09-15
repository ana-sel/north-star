jest.mock('../src/lib/db', () => ({
  exec: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-id' }));

import { exec, query, queryOne } from '../src/lib/db';
import { createHabit, tickHabit } from '../src/data/habits';
import { getPref, setPref } from '../src/data/prefs';
import { logReturn, pauseJourney, startPath } from '../src/data/paths';

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;

const pathRow = {
  journey_type: 'path', journey_id: 'stillness', status: 'active', current_camp: 1,
  started_at: '2026-09-04T00:00:00.000Z', camp1_closed_at: null, camp2_closed_at: null,
  camp3_closed_at: null, claimed_at: null, notes: null, updated_at: '2026-09-04T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockExec.mockResolvedValue({ changes: 1, lastInsertRowId: 1 } as never);
  mockQuery.mockResolvedValue([]);
});

describe('canonical journey persistence', () => {
  it('persists a Path using type path and its bundled ID', async () => {
    mockQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce(pathRow);

    await startPath('stillness');

    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO journey_progress'), expect.arrayContaining([
      'path', 'stillness', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    ]));
  });

  it('persists a Foundation using its type and unprefixed canonical ID', async () => {
    mockQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...pathRow, journey_type: 'foundation', journey_id: 'clear' });

    await startPath('foundation:clear');

    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO journey_progress'), expect.arrayContaining([
      'foundation', 'clear', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    ]));
  });

  it('persists returns, advances the 3/9/15 journey state, and pauses without legacy tables', async () => {
    mockQueryOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ ...pathRow, journey_type: 'foundation', journey_id: 'clear', status: 'resting' });

    await logReturn('foundation:clear', '2026-09-04', 'Asia/Tokyo', 1);
    await pauseJourney('foundation:clear');

    expect(mockExec.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      expect.stringContaining('INSERT INTO journey_returns'),
      expect.stringContaining('UPDATE journey_progress'),
    ]));
    expect(mockExec.mock.calls.some(([sql]) => /path_progress|path_returns/.test(sql))).toBe(false);
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('UPDATE journey_progress'), expect.arrayContaining([
      'foundation', 'clear',
    ]));
  });
});

describe('habit and preference persistence', () => {
  it('persists a habit and its timezone-aware local-day completion', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 'test-id', name: 'Morning light', ritual: 'morning', icon: null, cadence: 'daily',
      days_mask: null, duration_min: null, active: 1, archived_at: null,
      created_at: '2026-09-04T00:00:00.000Z', updated_at: '2026-09-04T00:00:00.000Z',
    }).mockResolvedValueOnce(null);

    await createHabit({ name: 'Morning light', ritual: 'morning', icon: null, cadence: 'daily', days_mask: null, duration_min: null });
    await tickHabit('habit-id', '2026-09-04', 'Asia/Tokyo');

    expect(mockExec.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      expect.stringContaining('INSERT INTO habits'),
      expect.stringContaining('INSERT INTO habit_completions'),
    ]));
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO habit_completions'), expect.arrayContaining([
      'habit-id', '2026-09-04', 'Asia/Tokyo',
    ]));
  });

  it('uses user_prefs as the sole sleep target persistence route', async () => {
    await setPref('sleep-target', { bed: { h: 23, m: 0 }, wake: { h: 7, m: 0 } });
    mockQueryOne.mockResolvedValueOnce({ value: '{"bed":{"h":23,"m":0},"wake":{"h":7,"m":0}}' });

    await expect(getPref('sleep-target', null)).resolves.toEqual({ bed: { h: 23, m: 0 }, wake: { h: 7, m: 0 } });
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_prefs'), expect.any(Array));
  });
});