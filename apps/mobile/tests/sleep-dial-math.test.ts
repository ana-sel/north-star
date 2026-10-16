import { dialDurationMinutes, dialMinutesFromPoint, snapDialMinutes } from '../src/features/sleep/components/sleepDialMath';

it('snaps around the 24-hour boundary in ten-minute steps', () => {
  expect(snapDialMinutes(4)).toBe(0);
  expect(snapDialMinutes(5)).toBe(10);
  expect(snapDialMinutes(1436)).toBe(0);
  expect(dialMinutesFromPoint(108, 32, 108)).toBe(0);
  expect(dialMinutesFromPoint(184, 108, 108)).toBe(360);
  expect(dialMinutesFromPoint(108, 184, 108)).toBe(720);
});

it('calculates overnight and same-day duration', () => {
  expect(dialDurationMinutes(23 * 60, 7 * 60)).toBe(480);
  expect(dialDurationMinutes(1 * 60, 7 * 60)).toBe(360);
  expect(dialDurationMinutes(23 * 60, 23 * 60)).toBe(1440);
});