import {
  buildWeeklyDots,
  cadenceLabel,
  completionLookupWithSets,
  partitionHabitGroups,
} from '../src/features/habits/habitsLogic';
import type { HabitDayStatus } from '../src/data/habits';

describe('Habits logic', () => {
  it('keeps morning/evening groups and routes non-standard ritual to anytime', () => {
    const rows = [
      { habit: { id: 'm', ritual: 'morning' }, completed: false },
      { habit: { id: 'e', ritual: 'evening' }, completed: false },
      { habit: { id: 'a', ritual: 'none' }, completed: false },
    ] as unknown as HabitDayStatus[];

    const grouped = partitionHabitGroups(rows);
    expect(grouped.morning.map((row) => row.habit.id)).toEqual(['m']);
    expect(grouped.evening.map((row) => row.habit.id)).toEqual(['e']);
    expect(grouped.anytime.map((row) => row.habit.id)).toEqual(['a']);
  });

  it('formats cadence labels for frozen V1 and custom masks', () => {
    expect(cadenceLabel('daily', null)).toBe('Daily');
    expect(cadenceLabel('weekdays', null)).toBe('Weekdays');
    expect(cadenceLabel('custom', 1 | 4 | 16)).toBe('3x/wk');
    expect(cadenceLabel('custom', null)).toBe('Custom');
  });

  it('builds week dots with explicit today marker', () => {
    const dots = buildWeeklyDots(
      ['2026-09-01', '2026-09-02', '2026-09-03'],
      new Set(['2026-09-01', '2026-09-03']),
      '2026-09-03',
    );
    expect(dots).toEqual([
      { localDate: '2026-09-01', done: true, today: false },
      { localDate: '2026-09-02', done: false, today: false },
      { localDate: '2026-09-03', done: true, today: true },
    ]);
  });

  it('turns completion rows into per-habit date sets', () => {
    const lookup = completionLookupWithSets({ h1: ['2026-09-07', '2026-09-06'] });
    expect(lookup.h1.has('2026-09-07')).toBe(true);
    expect(lookup.h1.has('2026-09-05')).toBe(false);
  });
});
