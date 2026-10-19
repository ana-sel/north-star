import {
  averageNightMinutes,
  dayLetterFor,
  minutesFromNoon,
  nightBars,
  nightRowLabels,
  nightWindow,
} from '../src/features/sleep/sleepNights';
import type { SleepEntry } from '../src/types';

function entry(start: string, end: string, timezone = 'Europe/London', duration: number | null = null): SleepEntry {
  return {
    id: `${start}`,
    user_id: '',
    sleep_start_utc: start,
    sleep_end_utc: end,
    timezone,
    duration_minutes: duration,
    note: null,
    energy: null,
    mood: null,
    created_at: start,
    updated_at: start,
  };
}

describe('Sleep nights chart', () => {
  it('keeps a night across midnight continuous', () => {
    expect(minutesFromNoon(18 * 60)).toBe(360);
    expect(minutesFromNoon(0)).toBe(720);
    expect(minutesFromNoon(7 * 60)).toBe(1140);
  });

  it('files a night under the local date it ended, in the zone it was logged', () => {
    // 23:30–07:10 BST (UTC+1) on 14→15 Oct 2026.
    const bars = nightBars([entry('2026-10-14T22:30:00Z', '2026-10-15T06:10:00Z')], ['2026-10-14', '2026-10-15']);
    expect(bars[0]).toBeNull();
    expect(bars[1]).toEqual({ date: '2026-10-15', dayLetter: 'T', startRel: 690, endRel: 1150, minutes: 460 });
  });

  it('uses the travel zone of each entry, not the device zone', () => {
    // 23:00–07:00 in Tokyo is 14:00–22:00 UTC.
    const [bar] = nightBars([entry('2026-10-14T14:00:00Z', '2026-10-14T22:00:00Z', 'Asia/Tokyo')], ['2026-10-15']);
    expect(bar?.startRel).toBe(660);
    expect(bar?.minutes).toBe(480);
  });

  it('shows the latest entry when a night was logged twice', () => {
    const bars = nightBars(
      [
        entry('2026-10-14T22:30:00Z', '2026-10-15T05:00:00Z'),
        entry('2026-10-14T22:30:00Z', '2026-10-15T06:10:00Z'),
      ],
      ['2026-10-15'],
    );
    expect(bars[0]?.minutes).toBe(460);
  });

  it('frames whole hours around bars and target, with a calm default', () => {
    expect(nightWindow([null, null])).toEqual({ lo: 600, hi: 1200 });
    const bars = nightBars([entry('2026-10-14T22:30:00Z', '2026-10-15T06:10:00Z')], ['2026-10-15']);
    expect(nightWindow(bars)).toEqual({ lo: 660, hi: 1200 });
    expect(nightWindow(bars, { bed: 22 * 60 + 30, wake: 7 * 60 })).toEqual({ lo: 600, hi: 1200 });
  });

  it('averages logged nights only', () => {
    expect(averageNightMinutes([null, null])).toBeNull();
    expect(
      averageNightMinutes([
        { date: 'a', dayLetter: 'M', startRel: 0, endRel: 400, minutes: 400 },
        null,
        { date: 'b', dayLetter: 'T', startRel: 0, endRel: 500, minutes: 500 },
      ]),
    ).toBe(450);
  });

  it('labels days and history rows in the logged zone', () => {
    expect(dayLetterFor('2026-10-15')).toBe('T');
    expect(dayLetterFor('2026-10-18')).toBe('S');
    expect(nightRowLabels(entry('2026-10-14T22:30:00Z', '2026-10-15T06:10:00Z'))).toEqual({
      title: 'Wed 14 Oct',
      times: '23:30 – 07:10',
    });
  });
});
