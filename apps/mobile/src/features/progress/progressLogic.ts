import { isHabitScheduledOnDate } from '@data/habitRules';

export type ProgressPeriod = 'week' | 'month';

export interface SleepEntryLike {
  sleep_end_utc: string;
  timezone: string;
  duration_minutes: number | null;
}

export interface HabitLike {
  id: string;
  cadence: 'daily' | 'weekdays' | 'custom';
  days_mask: number | null;
}

export interface HabitCompletionLike {
  habit_id: string;
  local_date: string;
}

export interface JourneyReturnLike {
  journey_type: 'path' | 'foundation';
  journey_id: string;
  local_date: string;
}

export interface TrendPoint {
  localDate: string;
  label: string;
  value: number | null;
  displayValue: string;
  normalized: number;
  hasData: boolean;
}

export interface SleepProgress {
  averageMinutes: number | null;
  averageLabel: string;
  coverageLabel: string;
  loggedNights: number;
  totalNights: number;
  points: TrendPoint[];
}

export interface HabitsProgress {
  adherencePercent: number | null;
  adherenceLabel: string;
  coverageLabel: string;
  activeHabits: number;
  doneTotal: number;
  expectedTotal: number;
  points: TrendPoint[];
}

export interface JourneyProgress {
  totalReturns: number;
  coverageLabel: string;
  distinctJourneys: number;
  activeDays: number;
  points: TrendPoint[];
}

export interface ProgressTile {
  key: 'sleep' | 'habits' | 'journeys';
  label: string;
  value: string;
  meta: string;
}

export interface ProgressSnapshot {
  period: ProgressPeriod;
  heading: string;
  localDates: string[];
  sleep: SleepProgress;
  habits: HabitsProgress;
  journeys: JourneyProgress;
  tiles: ProgressTile[];
}

export interface ProgressSnapshotInput {
  period: ProgressPeriod;
  today: string;
  sleepEntries: SleepEntryLike[];
  habits: HabitLike[];
  habitCompletions: HabitCompletionLike[];
  journeyReturns: JourneyReturnLike[];
}

const PERIOD_LENGTH: Record<ProgressPeriod, number> = {
  week: 7,
  month: 30,
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function asProgressPeriod(value: string | null | undefined): ProgressPeriod {
  return value === 'month' ? 'month' : 'week';
}

export function localDatesForPeriod(period: ProgressPeriod, today: string): string[] {
  return trailingLocalDates(today, PERIOD_LENGTH[period]);
}

export function buildProgressSnapshot(input: ProgressSnapshotInput): ProgressSnapshot {
  const localDates = localDatesForPeriod(input.period, input.today);
  const sleep = summarizeSleep(input.sleepEntries, localDates, input.period);
  const habits = summarizeHabits(input.habits, input.habitCompletions, localDates, input.period);
  const journeys = summarizeJourneys(input.journeyReturns, localDates, input.period);

  return {
    period: input.period,
    heading: input.period === 'week' ? 'This week' : 'This month',
    localDates,
    sleep,
    habits,
    journeys,
    tiles: [
      {
        key: 'sleep',
        label: 'Sleep',
        value: sleep.averageLabel,
        meta: sleep.coverageLabel,
      },
      {
        key: 'habits',
        label: 'Habits',
        value: habits.adherenceLabel,
        meta: `${habits.activeHabits} active`,
      },
      {
        key: 'journeys',
        label: 'Returns',
        value: String(journeys.totalReturns),
        meta: `${journeys.distinctJourneys} journeys`,
      },
    ],
  };
}

export function summarizeSleep(
  entries: SleepEntryLike[],
  localDates: string[],
  period: ProgressPeriod,
): SleepProgress {
  const dateSet = new Set(localDates);
  const byDate: Record<string, { sum: number; count: number }> = {};

  for (const entry of entries) {
    if (entry.duration_minutes == null || entry.duration_minutes <= 0) continue;
    const localDate = localDateForInstant(entry.sleep_end_utc, entry.timezone);
    if (!localDate || !dateSet.has(localDate)) continue;
    const current = byDate[localDate] ?? { sum: 0, count: 0 };
    current.sum += entry.duration_minutes;
    current.count += 1;
    byDate[localDate] = current;
  }

  const nightlyAverages = localDates.map((date) => {
    const bucket = byDate[date];
    if (!bucket || bucket.count === 0) return null;
    return Math.round(bucket.sum / bucket.count);
  });

  const loggedValues = nightlyAverages.filter((value): value is number => value != null);
  const loggedNights = loggedValues.length;
  const averageMinutes = loggedNights > 0
    ? Math.round(loggedValues.reduce((sum, value) => sum + value, 0) / loggedNights)
    : null;

  const points = buildTrendPoints({
    localDates,
    period,
    values: nightlyAverages,
    hasData: nightlyAverages.map((value) => value != null),
    formatValue: (value) => (value == null ? 'No entry' : formatDuration(value)),
  });

  return {
    averageMinutes,
    averageLabel: averageMinutes == null ? 'No data' : formatDuration(averageMinutes),
    coverageLabel: `${loggedNights} of ${localDates.length} nights`,
    loggedNights,
    totalNights: localDates.length,
    points,
  };
}

export function summarizeHabits(
  habits: HabitLike[],
  completions: HabitCompletionLike[],
  localDates: string[],
  period: ProgressPeriod,
): HabitsProgress {
  const dateSet = new Set(localDates);
  const habitIds = new Set(habits.map((habit) => habit.id));
  const completionSet = new Set(
    completions
      .filter((row) => habitIds.has(row.habit_id) && dateSet.has(row.local_date))
      .map((row) => `${row.habit_id}:${row.local_date}`),
  );

  let expectedTotal = 0;
  let doneTotal = 0;
  let coveredDays = 0;

  const dayValues: Array<number | null> = [];
  const hasData: boolean[] = [];

  for (const localDate of localDates) {
    let expected = 0;
    let done = 0;

    for (const habit of habits) {
      if (!isHabitScheduledOnDate(habit, localDate)) continue;
      expected += 1;
      if (completionSet.has(`${habit.id}:${localDate}`)) done += 1;
    }

    expectedTotal += expected;
    doneTotal += done;

    if (expected > 0) {
      coveredDays += 1;
      hasData.push(true);
      dayValues.push(Math.round((done / expected) * 100));
    } else {
      hasData.push(false);
      dayValues.push(null);
    }
  }

  const adherencePercent = expectedTotal > 0
    ? Math.round((doneTotal / expectedTotal) * 100)
    : null;

  const points = buildTrendPoints({
    localDates,
    period,
    values: dayValues,
    hasData,
    formatValue: (value) => (value == null ? 'No scheduled habits' : `${value}%`),
  });

  return {
    adherencePercent,
    adherenceLabel: adherencePercent == null ? 'No data' : `${adherencePercent}%`,
    coverageLabel:
      habits.length === 0
        ? 'No active habits'
        : `${coveredDays} of ${localDates.length} scheduled days`,
    activeHabits: habits.length,
    doneTotal,
    expectedTotal,
    points,
  };
}

export function summarizeJourneys(
  returns: JourneyReturnLike[],
  localDates: string[],
  period: ProgressPeriod,
): JourneyProgress {
  const dateSet = new Set(localDates);
  const rows = returns.filter((row) => dateSet.has(row.local_date));
  const byDate: Record<string, number> = {};
  const uniqueJourneys = new Set<string>();

  for (const row of rows) {
    byDate[row.local_date] = (byDate[row.local_date] ?? 0) + 1;
    uniqueJourneys.add(`${row.journey_type}:${row.journey_id}`);
  }

  const dayValues = localDates.map((date) => byDate[date] ?? 0);
  const activeDays = dayValues.filter((count) => count > 0).length;

  const points = buildTrendPoints({
    localDates,
    period,
    values: dayValues,
    hasData: dayValues.map((count) => count > 0),
    formatValue: (value) => `${value ?? 0}`,
  });

  return {
    totalReturns: rows.length,
    coverageLabel: `${activeDays} of ${localDates.length} days`,
    distinctJourneys: uniqueJourneys.size,
    activeDays,
    points,
  };
}

interface BuildTrendPointsInput {
  localDates: string[];
  period: ProgressPeriod;
  values: Array<number | null>;
  hasData: boolean[];
  formatValue: (value: number | null) => string;
}

function buildTrendPoints(input: BuildTrendPointsInput): TrendPoint[] {
  const labels = dayLabels(input.localDates, input.period);
  const max = input.values.reduce<number>((currentMax, value, index) => {
    if (!input.hasData[index] || value == null) return currentMax;
    return Math.max(currentMax, value ?? 0);
  }, 0);

  return input.localDates.map((localDate, index) => {
    const value = input.values[index];
    const hasData = input.hasData[index];
    return {
      localDate,
      label: labels[index],
      value,
      displayValue: input.formatValue(value),
      normalized: normalizedHeight(value, hasData, max),
      hasData,
    };
  });
}

function normalizedHeight(value: number | null, hasData: boolean, max: number): number {
  if (!hasData || value == null) return 0;
  if (max <= 0) return 0.14;
  return Math.max(0.14, value / max);
}

function dayLabels(localDates: string[], period: ProgressPeriod): string[] {
  if (period === 'week') {
    return localDates.map((date) => WEEKDAY_LABELS[dayOfWeek(date)]);
  }

  return localDates.map((date, index) => {
    const dayNumber = Number(date.slice(-2));
    if (index === 0 || index === localDates.length - 1 || dayNumber === 1 || dayNumber % 5 === 0) {
      return String(dayNumber);
    }
    return '';
  });
}

function formatDuration(minutes: number): string {
  const wholeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(wholeMinutes / 60);
  const mins = wholeMinutes % 60;
  return `${hours}h ${mins}m`;
}

function trailingLocalDates(endDate: string, days: number): string[] {
  const anchor = parseLocalDate(endDate);
  if (!anchor) return [];
  const dates: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(anchor.getTime());
    date.setUTCDate(date.getUTCDate() - offset);
    dates.push(formatLocalDate(date));
  }
  return dates;
}

function parseLocalDate(localDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatLocalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayOfWeek(localDate: string): number {
  const date = parseLocalDate(localDate);
  return date ? date.getUTCDay() : 0;
}

function localDateForInstant(instantISO: string, timezone: string): string | null {
  const instant = new Date(instantISO);
  if (Number.isNaN(instant.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) return null;
    return `${year}-${month}-${day}`;
  } catch {
    return formatLocalDate(instant);
  }
}