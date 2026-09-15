import type { TodayAIInsight } from './types';

const MAX_OBSERVATION = 240;
const MAX_ORIENTATION = 120;

/**
 * Deterministic structural validation for externally sourced responses.
 * Server-side safety remains authoritative; this only enforces shape and size.
 */
export function validateInsight(value: unknown): TodayAIInsight | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  if (typeof record.observation !== 'string') return null;
  const observation = record.observation.trim();
  if (!observation || observation.length > MAX_OBSERVATION) return null;

  if (record.orientation === undefined || record.orientation === null) {
    return { observation };
  }
  if (typeof record.orientation !== 'string') return null;
  const orientation = record.orientation.trim();
  if (orientation.length > MAX_ORIENTATION) return null;

  return orientation ? { observation, orientation } : { observation };
}
