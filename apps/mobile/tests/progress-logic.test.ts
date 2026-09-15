import {
  buildProgressSnapshot,
  localDatesForPeriod,
  summarizeHabits,
  summarizeJourneys,
  summarizeSleep,
} from '../src/features/progress/progressLogic';

describe('Progress logic', () => {
  it('builds local windows for week and month', () => {
    expect(localDatesForPeriod('week', '2026-09-13')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);

    const month = localDatesForPeriod('month', '2026-09-30');
    expect(month).toHaveLength(30);
    expect(month[0]).toBe('2026-09-01');
    expect(month[29]).toBe('2026-09-30');
  });

  it('summarizes sleep averages and coverage from entries in range', () => {
    const localDates = localDatesForPeriod('week', '2026-09-13');
    const sleep = summarizeSleep(
      [
        { sleep_end_utc: '2026-09-07T06:30:00.000Z', timezone: 'UTC', duration_minutes: 420 },
        { sleep_end_utc: '2026-09-09T06:50:00.000Z', timezone: 'UTC', duration_minutes: 390 },
        { sleep_end_utc: '2026-08-30T06:50:00.000Z', timezone: 'UTC', duration_minutes: 500 },
      ],
      localDates,
      'week',
    );

    expect(sleep.loggedNights).toBe(2);
    expect(sleep.coverageLabel).toBe('2 of 7 nights');
    expect(sleep.averageMinutes).toBe(405);
    expect(sleep.averageLabel).toBe('6h 45m');
    expect(sleep.points).toHaveLength(7);
    expect(sleep.points[0]).toMatchObject({ localDate: '2026-09-07', hasData: true });
  });

  it('computes habit adherence with cadence-aware denominator', () => {
    const localDates = localDatesForPeriod('week', '2026-09-13');
    const habits = [
      { id: 'daily', cadence: 'daily' as const, days_mask: null },
      { id: 'weekdays', cadence: 'weekdays' as const, days_mask: null },
      { id: 'custom', cadence: 'custom' as const, days_mask: 1 | 4 | 16 },
    ];

    const completions = [
      { habit_id: 'daily', local_date: '2026-09-07' },
      { habit_id: 'daily', local_date: '2026-09-08' },
      { habit_id: 'daily', local_date: '2026-09-09' },
      { habit_id: 'daily', local_date: '2026-09-10' },
      { habit_id: 'daily', local_date: '2026-09-11' },
      { habit_id: 'weekdays', local_date: '2026-09-07' },
      { habit_id: 'weekdays', local_date: '2026-09-08' },
      { habit_id: 'weekdays', local_date: '2026-09-09' },
      { habit_id: 'weekdays', local_date: '2026-09-10' },
      { habit_id: 'custom', local_date: '2026-09-07' },
      { habit_id: 'custom', local_date: '2026-09-09' },
    ];

    const summary = summarizeHabits(habits, completions, localDates, 'week');

    expect(summary.expectedTotal).toBe(15);
    expect(summary.doneTotal).toBe(11);
    expect(summary.adherencePercent).toBe(73);
    expect(summary.adherenceLabel).toBe('73%');
    expect(summary.coverageLabel).toBe('7 of 7 scheduled days');
  });

  it('counts journey returns and unique journeys by period', () => {
    const localDates = localDatesForPeriod('week', '2026-09-13');

    const summary = summarizeJourneys(
      [
        { journey_type: 'path', journey_id: 'stillness', local_date: '2026-09-08' },
        { journey_type: 'path', journey_id: 'warmth', local_date: '2026-09-08' },
        { journey_type: 'foundation', journey_id: 'regulate', local_date: '2026-09-10' },
        { journey_type: 'path', journey_id: 'stillness', local_date: '2026-09-12' },
      ],
      localDates,
      'week',
    );

    expect(summary.totalReturns).toBe(4);
    expect(summary.distinctJourneys).toBe(3);
    expect(summary.activeDays).toBe(3);
    expect(summary.coverageLabel).toBe('3 of 7 days');
    expect(summary.points).toHaveLength(7);
  });

  it('builds a snapshot with factual tiles and headings', () => {
    const snapshot = buildProgressSnapshot({
      period: 'month',
      today: '2026-09-30',
      sleepEntries: [],
      habits: [],
      habitCompletions: [],
      journeyReturns: [],
    });

    expect(snapshot.heading).toBe('This month');
    expect(snapshot.tiles.map((tile) => tile.label)).toEqual(['Sleep', 'Habits', 'Returns']);
    expect(snapshot.tiles[0].value).toBe('No data');
    expect(snapshot.tiles[1].value).toBe('No data');
    expect(snapshot.tiles[2].value).toBe('0');
  });
});