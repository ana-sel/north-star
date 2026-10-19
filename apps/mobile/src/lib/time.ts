// Timezone-aware time helpers.
// Rule: store UTC, remember the timezone it was logged in, display it back in that zone.

import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Format a UTC instant as "HH:mm" in a given timezone.
export function utcToLocal(utcTime: Date, timezone: string): string {
  return formatInTimeZone(utcTime, timezone, 'HH:mm');
}

/** Today's date as YYYY-MM-DD, computed in the given IANA timezone. */
export function localDateISO(timezone?: string): string {
  return localDateForInstant(new Date(), timezone);
}

/** An instant's calendar date in a given IANA timezone. */
export function localDateForInstant(instant: Date, timezone?: string): string {
  const tz = timezone ?? getDeviceTimezone();
  return formatInTimeZone(instant, tz, 'yyyy-MM-dd');
}

/** A local calendar date offset from today, safe across UTC boundaries. */
export function localDateOffset(days: number, timezone?: string): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const tz = timezone ?? getDeviceTimezone();
  return localDateForInstant(date, tz);
}

/** Local calendar dates in an inclusive trailing window, oldest first. */
export function localDateWindow(days: number, timezone?: string): string[] {
  return Array.from({ length: days }, (_, index) => localDateOffset(index - days + 1, timezone));
}

/**
 * Get user's device timezone (best guess)
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

// Return the UTC offset for an IANA timezone at the current moment,
// e.g. "UTC+1", "UTC-5", "UTC+5:30", "UTC".
export function getTimezoneOffset(tz: string): string {
  const mins = getTimezoneOffsetMinutes(tz);
  if (mins === 0) return 'UTC';
  const sign = mins > 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}`;
}

// Return the UTC offset in minutes (positive = east of UTC).
export function getTimezoneOffsetMinutes(tz: string): number {
  const now = new Date();
  const localMs = new Date(now.toLocaleString('sv-SE', { timeZone: tz })).getTime();
  const utcMs   = new Date(now.toLocaleString('sv-SE', { timeZone: 'UTC' })).getTime();
  return Math.round((localMs - utcMs) / 60000);
}

// Given a time value from the picker (correct HH:MM, arbitrary date),
// return the most-recent past occurrence of that time.
// Mirrors how clock/alarm apps decide "bed time was last night".
export function smartBedTime(selected: Date): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  if (candidate > now) {
    candidate.setDate(candidate.getDate() - 1);
  }
  return candidate;
}

// Given a wake time from the picker and an already-resolved bed time,
// return the wake date that is strictly after bedTime.
export function smartWakeTime(selected: Date, bedTime: Date): Date {
  const candidate = new Date(bedTime);
  candidate.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  if (candidate <= bedTime) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

export function changeTimeInTimezone(instant: Date, selected: Date, timezone: string): Date {
  const local = utcToZonedTime(instant, timezone);
  local.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return zonedTimeToUtc(local, timezone);
}

export function wakeAfterBedInTimezone(selected: Date, bedTime: Date, timezone: string): Date {
  const wake = changeTimeInTimezone(bedTime, selected, timezone);
  if (wake > bedTime) return wake;
  const nextDay = utcToZonedTime(bedTime, timezone);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return zonedTimeToUtc(nextDay, timezone);
}
