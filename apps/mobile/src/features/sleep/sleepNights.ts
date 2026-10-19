/**
 * Pure helpers for the Log · Sleep "Last 7 nights" range chart and history rows.
 * A night belongs to the local date its sleep ended on, in the zone it was logged in
 * (the same rule Today uses for "last night").
 */

import { formatInTimeZone } from 'date-fns-tz';
import { localDateForInstant } from '../../lib/time';
import type { SleepEntry } from '../../types';

export interface NightBar {
  date: string;
  dayLetter: string;
  /** Minutes after 12:00 on the previous day, so a night across midnight stays continuous. */
  startRel: number;
  endRel: number;
  minutes: number;
}

export interface NightWindow {
  lo: number;
  hi: number;
}

const DAY_LETTERS = 'SMTWTFS';

/** Clock minutes (0–1439) → minutes after noon (18:00 → 360, 00:00 → 720, 07:00 → 1140). */
export function minutesFromNoon(clockMinutes: number): number {
  return (clockMinutes - 720 + 1440) % 1440;
}

function clockMinutesIn(instant: Date, timezone: string): number {
  const [h, m] = formatInTimeZone(instant, timezone, 'HH:mm').split(':').map(Number);
  return h * 60 + m;
}

function entryMinutes(entry: SleepEntry): number {
  if (entry.duration_minutes != null) return entry.duration_minutes;
  return Math.max(0, Math.round((Date.parse(entry.sleep_end_utc) - Date.parse(entry.sleep_start_utc)) / 60000));
}

/** One bar per local date (oldest first); null where nothing was logged. Latest entry wins. */
export function nightBars(entries: SleepEntry[], dates: string[]): (NightBar | null)[] {
  const newestFirst = [...entries].sort((a, b) => b.sleep_end_utc.localeCompare(a.sleep_end_utc));
  return dates.map((date) => {
    const entry = newestFirst.find((e) => localDateForInstant(new Date(e.sleep_end_utc), e.timezone) === date);
    if (!entry) return null;
    const minutes = entryMinutes(entry);
    const startRel = minutesFromNoon(clockMinutesIn(new Date(entry.sleep_start_utc), entry.timezone));
    return { date, dayLetter: dayLetterFor(date), startRel, endRel: startRel + minutes, minutes };
  });
}

/** "2026-10-15" → "T". */
export function dayLetterFor(date: string): string {
  return DAY_LETTERS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

/** Vertical range of the chart: whole hours around the bars and the target, 22:00–08:00 by default. */
export function nightWindow(bars: (NightBar | null)[], target?: { bed: number; wake: number } | null): NightWindow {
  const starts = bars.flatMap((b) => (b ? [b.startRel] : []));
  const ends = bars.flatMap((b) => (b ? [b.endRel] : []));
  if (target) {
    starts.push(minutesFromNoon(target.bed));
    ends.push(minutesFromNoon(target.wake));
  }
  if (starts.length === 0) return { lo: 600, hi: 1200 };
  return {
    lo: Math.max(0, Math.floor((Math.min(...starts) - 30) / 60) * 60),
    hi: Math.ceil((Math.max(...ends) + 30) / 60) * 60,
  };
}

export function averageNightMinutes(bars: (NightBar | null)[]): number | null {
  const logged = bars.filter((b): b is NightBar => b !== null);
  if (logged.length === 0) return null;
  return Math.round(logged.reduce((sum, b) => sum + b.minutes, 0) / logged.length);
}

/** History row text in the zone the night was logged in: "Wed 14 Oct", "23:30 – 07:10". */
export function nightRowLabels(entry: SleepEntry): { title: string; times: string } {
  const start = new Date(entry.sleep_start_utc);
  const end = new Date(entry.sleep_end_utc);
  return {
    title: formatInTimeZone(start, entry.timezone, 'EEE d MMM'),
    times: `${formatInTimeZone(start, entry.timezone, 'HH:mm')} – ${formatInTimeZone(end, entry.timezone, 'HH:mm')}`,
  };
}
