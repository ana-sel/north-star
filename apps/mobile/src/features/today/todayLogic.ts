/**
 * Deterministic Today logic. Pure module — no React Native or Expo imports —
 * so it runs under the Node Jest content suite. The Coach surface reads from
 * this until Cloudflare Workers AI is wired in a later phase.
 */

export type PaceMode = 'full' | 'lighter' | 'rest';

export interface PaceSections {
  showSignals: boolean;
  banner: 'rest' | 'lighter' | null;
}

export function sectionsForPace(mode: PaceMode): PaceSections {
  switch (mode) {
    case 'rest':
      return { showSignals: false, banner: 'rest' };
    case 'lighter':
      return { showSignals: false, banner: 'lighter' };
    case 'full':
    default:
      return { showSignals: true, banner: null };
  }
}

export function paceNote(mode: PaceMode): string | null {
  switch (mode) {
    case 'rest':
      return 'Today is for rest. Just the essential floor — nothing is lost.';
    case 'lighter':
      return 'A lighter day. Fewer optional things — nothing is lost.';
    case 'full':
    default:
      return null;
  }
}

export interface InsightState {
  morningTotal: number;
  morningDone: number;
  sleptBelowTarget: boolean;
}

export interface Insight {
  tag: string;
  body: string;
}

/**
 * A small, transparent rules-based fallback for the Compass note, derived from
 * real Today state. It never repeats the practice card. Returns null when there
 * is nothing worth surfacing.
 */
export function buildInsight(state: InsightState): Insight | null {
  if (state.sleptBelowTarget) {
    return {
      tag: 'Gentle note',
      body: 'Shorter sleep than your target. Keep today lighter where you can — nothing is lost.',
    };
  }
  if (state.morningTotal > 0 && state.morningDone === state.morningTotal) {
    return {
      tag: 'Nicely done',
      body: 'Your morning ritual is complete. Nothing else is required today.',
    };
  }
  return null;
}

/** A 3+ day gap since the last active day earns a gentle welcome-back. */
export function shouldWelcomeBack(lastActiveDate: string | null, today: string): boolean {
  if (!lastActiveDate || lastActiveDate >= today) return false;
  const last = Date.parse(`${lastActiveDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(last) || Number.isNaN(now)) return false;
  const gapDays = Math.round((now - last) / 86_400_000);
  return gapDays >= 3;
}

export interface SleepTarget {
  bed: { h: number; m: number };
  wake: { h: number; m: number };
}

/**
 * Minutes implied by the canonical saved sleep target, or null when none is
 * saved. Null means "render a non-scored state" — never a hard-coded default.
 */
export function sleepTargetMinutes(target: SleepTarget | null): number | null {
  if (!target) return null;
  const bed = target.bed.h * 60 + target.bed.m;
  const wake = target.wake.h * 60 + target.wake.m;
  const minutes = (wake - bed + 1440) % 1440;
  return minutes || null;
}

/** Below target only when a real target exists — no invented score. */
export function isBelowSleepTarget(durationMinutes: number | null, targetMinutes: number | null): boolean {
  if (durationMinutes == null || targetMinutes == null) return false;
  return durationMinutes < targetMinutes - 30;
}

/** "7 hr 50 min", "8 hr", "45 min". */
export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  return h ? `${h} hr` : `${m} min`;
}

/** One factual line against the person's own target; nothing when no target is saved. */
export function sleepVsTarget(durationMinutes: number, targetMinutes: number | null): string | null {
  if (targetMinutes == null) return null;
  const diff = targetMinutes - durationMinutes;
  const target = formatSleepDuration(targetMinutes);
  if (diff === 0) return `Right on your ${target} target`;
  return diff > 0
    ? `${formatSleepDuration(diff)} under your ${target} target`
    : `${formatSleepDuration(-diff)} over your ${target} target`;
}
