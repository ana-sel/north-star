import type { TodayAIContext, TodayAIInsight } from './types';

/** Narrow structured-only boundary. No `generate(prompt: string)` is exposed. */
export interface TodayAIClient {
  generate(context: TodayAIContext): Promise<TodayAIInsight>;
}

/**
 * Development/local mock — zero network, deterministic, obviously test-oriented.
 * It derives a tiny response from structured context and does not pretend to be
 * a real model. Structured so a Cloudflare-backed client can replace it later.
 */
export function createMockTodayAIClient(): TodayAIClient {
  return {
    async generate(context: TodayAIContext): Promise<TodayAIInsight> {
      const pending = context.plan.dueToday - context.plan.completedToday;
      const observation = pending > 0
        ? 'You have a few things asking for attention today.'
        : 'Today looks calm so far.';

      const orientation = context.journey
        ? 'Keep your chosen Journey practice small.'
        : undefined;

      return orientation ? { observation, orientation } : { observation };
    },
  };
}
