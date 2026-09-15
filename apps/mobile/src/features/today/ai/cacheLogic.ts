import type { TodayAIInsight } from './types';
import { validateInsight } from './validate';

export interface CachedInsightRecord {
  localDate: string;
  observation: string;
  orientation?: string;
}

/**
 * Pure cache parsing: returns the insight only when the stored record is for
 * `today` and passes shape validation. Stale (different day) or malformed
 * records resolve to null so the day can become eligible again.
 */
export function parseCachedInsight(raw: unknown, today: string): TodayAIInsight | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (record.localDate !== today) return null;
  return validateInsight(record);
}

export function toCachedRecord(localDate: string, insight: TodayAIInsight): CachedInsightRecord {
  return insight.orientation
    ? { localDate, observation: insight.observation, orientation: insight.orientation }
    : { localDate, observation: insight.observation };
}
