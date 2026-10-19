import {
  buildProgressSnapshot,
  localDatesForPeriod,
  progressHighlight,
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
  });

  it('does not count days before a habit existed', () => {
    const localDates = localDatesForPeriod('week', '2026-09-13');
    const summary = summarizeHabits(
      [{ id: 'new', cadence: 'daily', days_mask: null, startLocalDate: '2026-09-11' }],
      [
        { habit_id: 'new', local_date: '2026-09-11' },
        { habit_id: 'new', local_date: '2026-09-12' },
      ],
      localDates,
      'week',
    );

    expect(summary.expectedTotal).toBe(3);
    expect(summary.doneTotal).toBe(2);
    expect(summary.adherencePercent).toBe(67);
    expect(summary.points.slice(0, 4).every((p) => !p.hasData)).toBe(true);
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
    );

    expect(summary.totalReturns).toBe(4);
    expect(summary.distinctJourneys).toBe(3);
    expect(summary.marks).toEqual([1.5 / 7, 3.5 / 7, 5.5 / 7]);
    expect(summary).not.toHaveProperty('coverageLabel');
  });

  it('writes one factual sleep highlight, against the target only when one is saved', () => {
    const localDates = localDatesForPeriod('week', '2026-09-13');
    const all = summarizeSleep(
      localDates.map((d) => ({ sleep_end_utc: `${d}T06:30:00.000Z`, timezone: 'UTC', duration_minutes: 458 })),
      localDates,
      'week',
    );
    expect(progressHighlight(all, 480)).toBe('You logged all 7 nights. Your average was 7 hr 38 min, 22 min under your 8 hr target.');
    expect(progressHighlight(all, null)).toBe('You logged all 7 nights. Your average was 7 hr 38 min.');

    const some = summarizeSleep(
      [{ sleep_end_utc: '2026-09-12T06:30:00.000Z', timezone: 'UTC', duration_minutes: 480 }],
      localDates,
      'week',
    );
    expect(progressHighlight(some, 480)).toBe('You logged 1 of 7 nights. Your average was 8 hr, right on your 8 hr target.');
    expect(progressHighlight(summarizeSleep([], localDates, 'week'), 480)).toBeNull();
  });

  it('builds an empty month snapshot without inventing values', () => {
    const snapshot = buildProgressSnapshot({
      period: 'month',
      today: '2026-09-30',
      sleepEntries: [],
      habits: [],
      habitCompletions: [],
      journeyReturns: [],
    });

    expect(snapshot.heading).toBe('This month');
    expect(snapshot.sleep.averageMinutes).toBeNull();
    expect(snapshot.habits.adherencePercent).toBeNull();
    expect(snapshot.journeys.totalReturns).toBe(0);
    expect(snapshot.journeys.marks).toEqual([]);
  });
});