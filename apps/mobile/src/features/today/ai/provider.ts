import type { TodayAIClient } from './client';
import { createMockTodayAIClient } from './client';

// React Native injects this global; typed loosely so this module stays pure.
declare const __DEV__: boolean | undefined;

export interface ProviderEnv {
  isDevelopment: boolean;
}

/**
 * Pure provider selection. Development may use the mock; production has no real
 * provider yet, so it returns null and Today falls back to the deterministic
 * Coach. A future Cloudflare client replaces the null branch — the mock is
 * never a production fallback.
 */
export function selectTodayAIClient(env: ProviderEnv): TodayAIClient | null {
  if (env.isDevelopment) return createMockTodayAIClient();
  return null;
}

/** Runtime entry point resolving the environment for the pure selector. */
export function getTodayAIClient(): TodayAIClient | null {
  const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__ === true;
  return selectTodayAIClient({ isDevelopment });
}
