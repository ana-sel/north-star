/**
 * Time & Timezone Utilities
 * Core logic for handling timezone-aware sleep tracking
 * 
 * RULE: Always store UTC times in database, remember the timezone they were logged in,
 * and display them back in that timezone.
 */

import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * Convert local time to UTC while remembering the timezone
 */
export function localToUTC(
  localTimeStr: string,
  timezone: string
): { utc: Date; iso: string } {
  // Parse local time string (format: "HH:mm")
  const [hours, minutes] = localTimeStr.split(':').map(Number);

  // Create a date in the specified timezone
  const today = new Date();
  const zoned = new Date(
    today.toLocaleString('en-US', { timeZone: timezone })
  );

  zoned.setHours(hours, minutes, 0, 0);

  // Convert to UTC
  const utc = fromZonedTime(zoned, timezone);

  return {
    utc,
    iso: utc.toISOString(),
  };
}

/**
 * Convert UTC time back to local time in a specific timezone
 */
export function utcToLocal(utcTime: Date, timezone: string): string {
  const zoned = toZonedTime(utcTime, timezone);
  return formatInTimeZone(zoned, timezone, 'HH:mm');
}

/**
 * Calculate duration between two UTC times
 * Always returns correct duration regardless of timezone or DST
 */
export function calculateDuration(
  startUtc: Date,
  endUtc: Date
): { minutes: number; formatted: string } {
  const durationMs = endUtc.getTime() - startUtc.getTime();
  const minutes = Math.round(durationMs / (1000 * 60));

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const formatted = `${hours}h ${mins}m`;

  return { minutes, formatted };
}

/**
 * Get average sleep duration from multiple entries
 */
export function calculateAverageSleep(durations: number[]): string {
  if (durations.length === 0) return '0h 0m';

  const totalMinutes = durations.reduce((a, b) => a + b, 0);
  const avgMinutes = Math.round(totalMinutes / durations.length);

  const hours = Math.floor(avgMinutes / 60);
  const mins = avgMinutes % 60;

  return `${hours}h ${mins}m`;
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
