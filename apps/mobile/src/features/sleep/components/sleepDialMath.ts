const DAY_MINUTES = 24 * 60;

export function snapDialMinutes(minutes: number): number {
  return ((Math.round(minutes / 10) * 10) % DAY_MINUTES + DAY_MINUTES) % DAY_MINUTES;
}

export function dialMinutesFromPoint(x: number, y: number, center: number): number {
  const angle = Math.atan2(y - center, x - center) + Math.PI / 2;
  return snapDialMinutes(angle * DAY_MINUTES / (2 * Math.PI));
}

export function dialDurationMinutes(bedMinutes: number, wakeMinutes: number): number {
  return ((wakeMinutes - bedMinutes) % DAY_MINUTES + DAY_MINUTES) % DAY_MINUTES || DAY_MINUTES;
}

export function dialPoint(minutes: number, center: number, radius: number): { x: number; y: number } {
  const angle = minutes * 2 * Math.PI / DAY_MINUTES - Math.PI / 2;
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}