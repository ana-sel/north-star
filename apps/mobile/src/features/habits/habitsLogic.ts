import type { Cadence, HabitDayStatus } from '@data/habits';

export interface HabitGroups {
  morning: HabitDayStatus[];
  evening: HabitDayStatus[];
  anytime: HabitDayStatus[];
}

export interface WeekDot {
  localDate: string;
  done: boolean;
  today: boolean;
}

export function partitionHabitGroups(items: HabitDayStatus[]): HabitGroups {
  return {
    morning: items.filter((row) => row.habit.ritual === 'morning'),
    evening: items.filter((row) => row.habit.ritual === 'evening'),
    anytime: items.filter((row) => row.habit.ritual !== 'morning' && row.habit.ritual !== 'evening'),
  };
}

export function cadenceLabel(cadence: Cadence, daysMask: number | null): string {
  if (cadence === 'daily') return 'Daily';
  if (cadence === 'weekdays') return 'Weekdays';
  const daysPerWeek = countDaysInMask(daysMask);
  if (daysPerWeek <= 0) return 'Custom';
  return `${daysPerWeek}x/wk`;
}

export function buildWeeklyDots(
  localDatesOldestFirst: string[],
  completedDates: Set<string>,
  today: string,
): WeekDot[] {
  return localDatesOldestFirst.map((date) => ({
    localDate: date,
    done: completedDates.has(date),
    today: date === today,
  }));
}

export function ritualStreakDays(
  habitIds: string[],
  localDatesNewestFirst: string[],
  completionLookup: Record<string, Set<string>>,
): number {
  if (habitIds.length === 0) return 0;
  let streak = 0;
  for (const localDate of localDatesNewestFirst) {
    const allDone = habitIds.every((id) => completionLookup[id]?.has(localDate));
    if (!allDone) break;
    streak += 1;
  }
  return streak;
}

export function completionLookupWithSets(
  completionByHabit: Record<string, string[]>,
): Record<string, Set<string>> {
  return Object.fromEntries(
    Object.entries(completionByHabit).map(([habitId, dates]) => [habitId, new Set(dates)]),
  );
}

function countDaysInMask(daysMask: number | null): number {
  if (!daysMask) return 0;
  let value = daysMask;
  let bits = 0;
  while (value > 0) {
    bits += value & 1;
    value >>= 1;
  }
  return bits;
}
