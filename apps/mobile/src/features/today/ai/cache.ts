import { getPref, setPref } from '@data/prefs';
import type { TodayAIInsight } from './types';
import { parseCachedInsight, toCachedRecord } from './cacheLogic';

// This does not enforce AI quota.
// Server-side identity/idempotency will do that.
const CACHE_KEY = 'ai:today-insight';

/** Returns the cached insight only when it is valid and for `localDate`. */
export async function readTodayAIInsight(localDate: string): Promise<TodayAIInsight | null> {
  const raw = await getPref<unknown>(CACHE_KEY, null);
  return parseCachedInsight(raw, localDate);
}

/** Overwrites the single daily record. Never accumulates one key per date. */
export async function writeTodayAIInsight(localDate: string, insight: TodayAIInsight): Promise<void> {
  await setPref(CACHE_KEY, toCachedRecord(localDate, insight));
}
