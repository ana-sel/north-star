// Timezone-aware time helpers.
// Rule: store UTC, remember the timezone it was logged in, display it back in that zone.

import { formatInTimeZone } from 'date-fns-tz';

// Format a UTC instant as "HH:mm" in a given timezone.
export function utcToLocal(utcTime: Date, timezone: string): string {
  return formatInTimeZone(utcTime, timezone, 'HH:mm');
}

// Minutes between two instants, plus a human "7h 35m" label. DST-safe.
export function calculateDuration(
  startUtc: Date,
  endUtc: Date
): { minutes: number; formatted: string } {
  const minutes = Math.round((endUtc.getTime() - startUtc.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  return { minutes, formatted: `${hours}h ${minutes % 60}m` };
}


/**
 * Get list of supported IANA timezones
 */
export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Vilnius',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Bangkok',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Pacific/Auckland',
];

/**
 * Validate if timezone is valid
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
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
