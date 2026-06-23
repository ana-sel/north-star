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
