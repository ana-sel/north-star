import type { TodayAIContext } from './types';

export interface EligibilityState {
  hasCacheForToday: boolean;
}

/**
 * Conservative V1 gate — no scoring engine. Eligible only when there is no
 * same-day cache, the pace is Full (Lighter and Rest hide the Today insight
 * surface, so AI must not generate for them), and at least two useful signal
 * categories are present (logged sleep, scheduled habits, tasks due, selected
 * journey). Otherwise the deterministic Coach is enough.
 */
export function shouldRequestAI(context: TodayAIContext, state: EligibilityState): boolean {
  if (state.hasCacheForToday) return false;
  if (context.pace !== 'full') return false;

  let signals = 0;
  if (context.sleep.logged) signals += 1;
  if (context.habits.scheduled > 0) signals += 1;
  if (context.plan.dueToday > 0) signals += 1;
  if (context.journey) signals += 1;

  return signals >= 2;
}
