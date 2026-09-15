export type HabitCadence = 'daily' | 'weekdays' | 'custom';

export interface HabitSchedule {
  cadence: HabitCadence;
  days_mask: number | null;
}

/** Canonical answer to "is this habit scheduled on YYYY-MM-DD?" */
export function isHabitScheduledOnDate(habit: HabitSchedule, localDate: string): boolean {
  if (habit.cadence === 'daily') return true;
  const day = dayOfWeek(localDate);
  if (habit.cadence === 'weekdays') return day !== 0 && day !== 6;
  if (habit.days_mask === null) return false;
  const mondayBasedDay = day === 0 ? 6 : day - 1;
  return (habit.days_mask & (1 << mondayBasedDay)) !== 0;
}

export function habitExpectedDays(habit: HabitSchedule, localDates: string[]): number {
  return localDates.filter((date) => isHabitScheduledOnDate(habit, date)).length;
}

function dayOfWeek(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}