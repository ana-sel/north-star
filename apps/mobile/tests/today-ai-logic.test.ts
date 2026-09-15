import { buildTodayAIContext, type TodayAISource } from '../src/features/today/ai/context';
import { shouldRequestAI } from '../src/features/today/ai/eligibility';
import { validateInsight } from '../src/features/today/ai/validate';
import { parseCachedInsight, toCachedRecord } from '../src/features/today/ai/cacheLogic';
import { createMockTodayAIClient } from '../src/features/today/ai/client';
import { selectTodayAIClient } from '../src/features/today/ai/provider';
import type { TodayAIContext } from '../src/features/today/ai/types';

function baseSource(overrides: Partial<TodayAISource> = {}): TodayAISource {
  return {
    localDate: '2026-09-08', // Tuesday
    pace: 'full',
    sleepDurationMinutes: null,
    sleepTargetMinutes: null,
    habits: [],
    planDueToday: 0,
    planCompletedToday: 0,
    journey: null,
    ...overrides,
  };
}

function baseContext(overrides: Partial<TodayAIContext> = {}): TodayAIContext {
  return {
    localDate: '2026-09-08',
    pace: 'full',
    sleep: { logged: false },
    habits: {
      scheduled: 0, completed: 0,
      morningScheduled: 0, morningCompleted: 0,
      eveningScheduled: 0, eveningCompleted: 0,
    },
    plan: { dueToday: 0, completedToday: 0 },
    ...overrides,
  };
}

describe('Today AI context builder', () => {
  it('maps a foundation journey to an unprefixed id, type, and lowercase stage', () => {
    const context = buildTodayAIContext(baseSource({
      journey: {
        pathId: 'foundation:regulate',
        type: 'foundation',
        title: 'Regulate',
        camp: 3,
        practice: 'Settle before choosing.',
      },
    }));

    expect(context.journey).toEqual({
      id: 'regulate',
      type: 'foundation',
      title: 'Regulate',
      stage: 'under_pressure',
      practice: 'Settle before choosing.',
    });
  });

  it('maps a path journey camp to the wire stage enum', () => {
    expect(buildTodayAIContext(baseSource({
      journey: { pathId: 'stillness', type: 'path', title: 'Stillness', camp: 1, practice: 'Pause once.' },
    })).journey?.stage).toBe('watching');

    expect(buildTodayAIContext(baseSource({
      journey: { pathId: 'stillness', type: 'path', title: 'Stillness', camp: 2, practice: 'Pause once.' },
    })).journey?.stage).toBe('doing');
  });

  it('computes cadence-aware habit aggregates with anytime folded into totals only', () => {
    const context = buildTodayAIContext(baseSource({
      localDate: '2026-09-08', // Tuesday
      habits: [
        { id: 'm', ritual: 'morning', cadence: 'daily', days_mask: null, completed: true },
        { id: 'e', ritual: 'evening', cadence: 'daily', days_mask: null, completed: false },
        { id: 'a', ritual: 'none', cadence: 'daily', days_mask: null, completed: true },
        // Scheduled Mon/Wed/Fri only (mask 1|4|16) → NOT scheduled on Tuesday.
        { id: 'c', ritual: 'morning', cadence: 'custom', days_mask: 1 | 4 | 16, completed: false },
      ],
    }));

    expect(context.habits).toEqual({
      scheduled: 3,          // m, e, a (c not scheduled Tuesday)
      completed: 2,          // m, a
      morningScheduled: 1,   // m only (c excluded)
      morningCompleted: 1,
      eveningScheduled: 1,
      eveningCompleted: 0,
    });
  });

  it('omits sleep duration/target when absent and never defaults to 8 hours', () => {
    const noSleep = buildTodayAIContext(baseSource());
    expect(noSleep.sleep).toEqual({ logged: false });
    expect(noSleep.sleep.durationMinutes).toBeUndefined();
    expect(noSleep.sleep.targetMinutes).toBeUndefined();

    const withSleep = buildTodayAIContext(baseSource({ sleepDurationMinutes: 400 }));
    expect(withSleep.sleep).toEqual({ logged: true, durationMinutes: 400 });
    expect(withSleep.sleep.targetMinutes).toBeUndefined();
  });

  it('carries only structured fields — no task titles, habit names, or free text', () => {
    const context = buildTodayAIContext(baseSource({
      planDueToday: 2,
      planCompletedToday: 1,
      habits: [{ id: 'm', ritual: 'morning', cadence: 'daily', days_mask: null, completed: false }],
    }));

    const serialized = JSON.stringify(context);
    expect(context.plan).toEqual({ dueToday: 2, completedToday: 1 });
    // Habit id is not part of the wire context at all.
    expect(serialized).not.toContain('"id"');
    expect(Object.keys(context).sort()).toEqual(['habits', 'localDate', 'pace', 'plan', 'sleep']);
  });
});

describe('Today AI eligibility', () => {
  it('is ineligible when a same-day cache already exists', () => {
    const context = baseContext({ sleep: { logged: true }, habits: { ...baseContext().habits, scheduled: 3 } });
    expect(shouldRequestAI(context, { hasCacheForToday: true })).toBe(false);
  });

  it('is always ineligible in Rest', () => {
    const context = baseContext({
      pace: 'rest',
      sleep: { logged: true },
      plan: { dueToday: 3, completedToday: 0 },
      journey: { id: 'stillness', type: 'path', title: 'Stillness', stage: 'watching', practice: 'Pause.' },
    });
    expect(shouldRequestAI(context, { hasCacheForToday: false })).toBe(false);
  });

  it('is ineligible in Lighter (the insight surface is hidden)', () => {
    const context = baseContext({
      pace: 'lighter',
      sleep: { logged: true },
      plan: { dueToday: 3, completedToday: 0 },
      journey: { id: 'stillness', type: 'path', title: 'Stillness', stage: 'watching', practice: 'Pause.' },
    });
    expect(shouldRequestAI(context, { hasCacheForToday: false })).toBe(false);
  });

  it('needs at least two signal categories', () => {
    const oneSignal = baseContext({ sleep: { logged: true } });
    expect(shouldRequestAI(oneSignal, { hasCacheForToday: false })).toBe(false);

    const twoSignals = baseContext({
      sleep: { logged: true },
      plan: { dueToday: 1, completedToday: 0 },
    });
    expect(shouldRequestAI(twoSignals, { hasCacheForToday: false })).toBe(true);
  });
});

describe('Today AI provider selection', () => {
  it('may return the mock in development', () => {
    expect(selectTodayAIClient({ isDevelopment: true })).not.toBeNull();
  });

  it('never returns the mock in production (null until a real provider exists)', () => {
    expect(selectTodayAIClient({ isDevelopment: false })).toBeNull();
  });
});

describe('Today AI response validation', () => {
  it('accepts a well-formed insight and trims whitespace', () => {
    expect(validateInsight({ observation: '  Calm day.  ' })).toEqual({ observation: 'Calm day.' });
    expect(validateInsight({ observation: 'A', orientation: '  Keep it small.  ' }))
      .toEqual({ observation: 'A', orientation: 'Keep it small.' });
  });

  it('rejects malformed, empty, or oversized responses', () => {
    expect(validateInsight(null)).toBeNull();
    expect(validateInsight({})).toBeNull();
    expect(validateInsight({ observation: '   ' })).toBeNull();
    expect(validateInsight({ observation: 5 })).toBeNull();
    expect(validateInsight({ observation: 'ok', orientation: 9 })).toBeNull();
    expect(validateInsight({ observation: 'x'.repeat(241) })).toBeNull();
  });
});

describe('Today AI local cache parsing', () => {
  it('returns a valid same-day cached insight', () => {
    const record = toCachedRecord('2026-09-08', { observation: 'Calm.', orientation: 'Small step.' });
    expect(parseCachedInsight(record, '2026-09-08')).toEqual({ observation: 'Calm.', orientation: 'Small step.' });
  });

  it('treats a different-day cache as absent', () => {
    const record = toCachedRecord('2026-09-07', { observation: 'Old.' });
    expect(parseCachedInsight(record, '2026-09-08')).toBeNull();
  });

  it('ignores malformed cache values', () => {
    expect(parseCachedInsight('not-json-object', '2026-09-08')).toBeNull();
    expect(parseCachedInsight({ localDate: '2026-09-08' }, '2026-09-08')).toBeNull();
  });
});

describe('Mock Today AI client', () => {
  it('returns a valid structured insight without networking', async () => {
    const client = createMockTodayAIClient();
    const insight = await client.generate(baseContext({
      plan: { dueToday: 2, completedToday: 0 },
      journey: { id: 'stillness', type: 'path', title: 'Stillness', stage: 'watching', practice: 'Pause.' },
    }));

    expect(validateInsight(insight)).toEqual(insight);
    expect(insight.observation.length).toBeGreaterThan(0);
    expect(insight.orientation).toBe('Keep your chosen Journey practice small.');
  });
});
