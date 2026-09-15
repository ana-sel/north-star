import { ACTIVE_JOURNEY_CAP, canResumeJourney, canStartJourney, journeyCampForReturns, REFLECTION_RETURNS } from '../src/data/journeyRules';
import { FOUNDATION_IDS, FOUNDATIONS } from '../src/features/foundations/foundationsContent';
import { foundationJourneyId } from '../src/features/foundations/foundationsContent';
import { V1_HABIT_TEMPLATES } from '../src/features/habits/habitTemplates';
import { DATA, V1_FEATURED_PATH_IDS, V1_PATH_CONTRACT } from '../src/features/paths/pathsContent';
import { habitExpectedDays } from '../src/data/habitRules';
import { isHabitScheduledOnDate } from '../src/data/habitRules';
import { schemaSQL } from '../src/lib/db/schema';
import { localDateForInstant } from '../src/lib/time';

describe('shared journey rules', () => {
  it('caps Paths and Foundations at three active journeys', () => {
    expect(ACTIVE_JOURNEY_CAP).toBe(3);
    expect(canStartJourney(0)).toBe(true);
    expect(canStartJourney(2)).toBe(true);
    expect(canStartJourney(3)).toBe(false);
  });

  it('excludes a paused journey from the active cap and blocks a fourth resume', () => {
    const activeAfterPausingOneOfThree = 2;
    expect(canStartJourney(activeAfterPausingOneOfThree)).toBe(true);
    expect(canResumeJourney(activeAfterPausingOneOfThree)).toBe(true);
    expect(canResumeJourney(3)).toBe(false);
  });

  it('advances the three stages at frozen return thresholds', () => {
    expect(journeyCampForReturns(0)).toBe(1);
    expect(journeyCampForReturns(2)).toBe(1);
    expect(journeyCampForReturns(3)).toBe(2);
    expect(journeyCampForReturns(8)).toBe(2);
    expect(journeyCampForReturns(9)).toBe(3);
    expect(REFLECTION_RETURNS).toBe(15);
  });
});

describe('frozen V1 content', () => {
  it('has 13 Foundations, 14 featured Paths, 9 templates, and 41 master Paths', () => {
    expect(FOUNDATIONS).toHaveLength(13);
    expect(V1_FEATURED_PATH_IDS).toHaveLength(14);
    expect(V1_HABIT_TEMPLATES).toHaveLength(9);
    expect(Object.keys(DATA)).toHaveLength(41);
  });

  it('matches every featured Path runtime entry to its frozen contract without a daily ritual', () => {
    for (const pathId of V1_FEATURED_PATH_IDS) {
      const runtime = DATA[pathId];
      const contract = V1_PATH_CONTRACT[pathId];
      expect(runtime).toMatchObject(contract);
      expect(runtime.ritual).toBeNull();
    }
  });

  it('assigns every Habit template to a real Foundation', () => {
    for (const template of V1_HABIT_TEMPLATES) {
      expect(FOUNDATION_IDS.has(template.ownerFoundationId)).toBe(true);
      expect(['morning', 'evening']).toContain(template.ritual);
    }
  });
});

describe('local dates and habit cadence', () => {
  it('derives local calendar dates from the event timezone rather than UTC', () => {
    const instant = new Date('2026-09-04T00:30:00.000Z');
    expect(localDateForInstant(instant, 'America/Los_Angeles')).toBe('2026-09-03');
    expect(localDateForInstant(instant, 'Asia/Tokyo')).toBe('2026-09-04');
  });

  it('counts only scheduled dates for daily, weekday, and custom habits', () => {
    const week = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
    expect(habitExpectedDays({ cadence: 'daily', days_mask: null }, week)).toBe(7);
    expect(habitExpectedDays({ cadence: 'weekdays', days_mask: null }, week)).toBe(5);
    expect(habitExpectedDays({ cadence: 'custom', days_mask: 1 | 4 | 16 }, week)).toBe(3);
  });

  it('shares one per-day scheduling predicate (Mon 2026-09-07 vs Sun 2026-09-13)', () => {
    expect(isHabitScheduledOnDate({ cadence: 'daily', days_mask: null }, '2026-09-13')).toBe(true);
    expect(isHabitScheduledOnDate({ cadence: 'weekdays', days_mask: null }, '2026-09-13')).toBe(false); // Sunday
    expect(isHabitScheduledOnDate({ cadence: 'custom', days_mask: 1 }, '2026-09-07')).toBe(true);  // Monday bit
    expect(isHabitScheduledOnDate({ cadence: 'custom', days_mask: 1 }, '2026-09-08')).toBe(false); // Tuesday
  });
});

describe('clean V1 persistence contract', () => {
  it('contains only the eight required local SQLite tables', () => {
    const tables = [...schemaSQL.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/g)].map((match) => match[1]);
    expect(tables).toEqual([
      'schema_meta', 'sleep_entries', 'habits', 'habit_completions',
      'tasks', 'journey_progress', 'journey_returns', 'user_prefs',
    ]);
  });

  it('uses typed generic journeys without legacy Path tables', () => {
    expect(schemaSQL).toMatch(/journey_type\s+TEXT NOT NULL CHECK \(journey_type IN \('path','foundation'\)\)/);
    expect(schemaSQL).not.toContain('path_progress');
    expect(schemaSQL).not.toContain('path_returns');
    expect(foundationJourneyId('clear')).toBe('foundation:clear');
  });
});