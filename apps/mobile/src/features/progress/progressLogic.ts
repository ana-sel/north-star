import { isHabitScheduledOnDate } from '@data/habitRules';
import { formatSleepDuration, sleepVsTarget } from '@features/today/todayLogic';

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
  /** Local date the habit was created; earlier days are not counted as due. */
  startLocalDate?: string | null;
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
  normalized: number;
  hasData: boolean;
}

export interface SleepProgress {
  averageMinutes: number | null;
  coverageLabel: string;
  loggedNights: number;
  totalNights: number;
  points: TrendPoint[];
}

export interface HabitsProgress {
  adherencePercent: number | null;
  doneTotal: number;
  expectedTotal: number;
  points: TrendPoint[];
}

export interface JourneyProgress {
  totalReturns: number;
  distinctJourneys: number;
  /** 0–1 positions of days with a return; gaps are rest, never empty cells. */
  marks: number[];
}

export interface ProgressSnapshot {
  period: ProgressPeriod;
  heading: string;
  localDates: string[];
  sleep: SleepProgress;
  habits: HabitsProgress;
  journeys: JourneyProgress;
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
  const journeys = summarizeJourneys(input.journeyReturns, localDates);

  return {
    period: input.period,
    heading: input.period === 'week' ? 'This week' : 'This month',
    localDates,
    sleep,
    habits,
    journeys,
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
  });

  return {
    averageMinutes,
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

  const dayValues: Array<number | null> = [];
  const hasData: boolean[] = [];

  for (const localDate of localDates) {
    let expected = 0;
    let done = 0;

    for (const habit of habits) {
      if (habit.startLocalDate && localDate < habit.startLocalDate) continue;
      if (!isHabitScheduledOnDate(habit, localDate)) continue;
      expected += 1;
      if (completionSet.has(`${habit.id}:${localDate}`)) done += 1;
    }

    expectedTotal += expected;
    doneTotal += done;

    if (expected > 0) {
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
  });

  return {
    adherencePercent,
    doneTotal,
    expectedTotal,
    points,
  };
}

export function summarizeJourneys(
  returns: JourneyReturnLike[],
  localDates: string[],
): JourneyProgress {
  const dateSet = new Set(localDates);
  const rows = returns.filter((row) => dateSet.has(row.local_date));
  const returnDays = new Set(rows.map((row) => row.local_date));
  const uniqueJourneys = new Set(rows.map((row) => `${row.journey_type}:${row.journey_id}`));

  return {
    totalReturns: rows.length,
    distinctJourneys: uniqueJourneys.size,
    marks: localDates.flatMap((date, index) => (returnDays.has(date) ? [(index + 0.5) / localDates.length] : [])),
  };
}

/** One factual sentence about sleep in the period; null when nothing was logged. */
export function progressHighlight(sleep: SleepProgress, targetMinutes: number | null): string | null {
  if (sleep.loggedNights === 0 || sleep.averageMinutes == null) return null;
  const nights = sleep.loggedNights === sleep.totalNights
    ? `You logged all ${sleep.totalNights} nights.`
    : `You logged ${sleep.loggedNights} of ${sleep.totalNights} nights.`;
  const average = `Your average was ${formatSleepDuration(sleep.averageMinutes)}`;
  const compare = sleepVsTarget(sleep.averageMinutes, targetMinutes);
  return compare ? `${nights} ${average}, ${compare.charAt(0).toLowerCase()}${compare.slice(1)}.` : `${nights} ${average}.`;
}

interface BuildTrendPointsInput {
  localDates: string[];
  period: ProgressPeriod;
  values: Array<number | null>;
  hasData: boolean[];
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