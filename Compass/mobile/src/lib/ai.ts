/**
 * AI Note Generation
 * 
 * Strategy:
 * 1. Call Supabase Edge Function with sleep data
 * 2. If it fails or times out, fall back to rule-based note
 * 3. User always sees a note, no errors
 */

import { supabase } from './supabase';
import { AINoteRequest, AINoteResponse } from '../types/index';

const AI_FUNCTION_TIMEOUT = 2000; // 2 second timeout

/**
 * Call the Edge Function to generate an AI note
 */
async function callAIFunction(request: AINoteRequest): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FUNCTION_TIMEOUT);

    const response = await supabase.functions.invoke('generate-note', {
      body: request,
    });

    clearTimeout(timeoutId);

    if (response.error) {
      console.warn('AI function error:', response.error);
      return null;
    }

    const data = response.data as AINoteResponse;
    return data.note || null;
  } catch (error) {
    console.warn('AI function call failed:', error);
    return null;
  }
}

/**
 * Rule-based fallback note
 * Always works, no API calls needed
 */
export function generateRuleBasedNote(
  sleepData: Array<{
    duration_minutes: number;
    sleep_start_utc: string;
    sleep_end_utc: string;
  }>
): string {
  if (sleepData.length === 0) {
    return 'No sleep data yet. Log your first night to see insights.';
  }

  // Calculate stats
  const durations = sleepData.map((s) => s.duration_minutes);
  const totalMinutes = durations.reduce((a, b) => a + b, 0);
  const avgMinutes = Math.round(totalMinutes / durations.length);
  const latestDuration = durations[0];

  const avgHours = Math.floor(avgMinutes / 60);
  const avgMins = avgMinutes % 60;
  const latestHours = Math.floor(latestDuration / 60);
  const latestMins = latestDuration % 60;

  // Generate observations
  const observations = [];

  if (avgHours < 6) {
    observations.push("You're getting less than 6 hours on average.");
  } else if (avgHours > 8) {
    observations.push("You're averaging over 8 hours — good recovery.");
  }

  if (durations.length >= 3) {
    const variance = Math.max(...durations) - Math.min(...durations);
    if (variance > 120) {
      observations.push('Your sleep varies quite a bit day to day.');
    }
  }

  // Build note
  let note = `Average ${avgHours}h ${avgMins}m this week. `;
  note += `Latest night: ${latestHours}h ${latestMins}m.`;

  if (observations.length > 0) {
    note += ` ${observations[0]}`;
  }

  return note;
}

/**
 * Main function: Get AI note or fall back to rule-based
 * Returns the note text and whether it came from AI or rule-based fallback
 */
export async function generateNote(
  sleepData: Array<{
    duration_minutes: number;
    sleep_start_utc: string;
    sleep_end_utc: string;
    timezone?: string;
  }>,
  userId?: string
): Promise<{ note: string; isAI: boolean }> {
  // Try AI first
  const aiNote = await callAIFunction({
    nights: sleepData.map((s) => ({
      start_utc: s.sleep_start_utc,
      end_utc: s.sleep_end_utc,
      timezone: s.timezone ?? 'UTC',
      duration_minutes: s.duration_minutes,
    })),
    user_id: userId,
  });

  if (aiNote) {
    return { note: aiNote, isAI: true };
  }

  // Fall back to rule-based
  return { note: generateRuleBasedNote(sleepData), isAI: false };
}

export default generateNote;
