/**
 * Sleep note generation — v1 is fully local. No Supabase, no network.
 *
 * `generateNote` is kept as an async function so callers don't have to change
 * when we reintroduce a cloud LLM path in a later version.
 */

/**
 * Rule-based note. Always works, no API calls needed.
 */
export function generateRuleBasedNote(
  sleepData: Array<{
    duration_minutes: number;
    sleep_start_utc: string;
    sleep_end_utc: string;
  }>,
): string {
  if (sleepData.length === 0) {
    return 'No sleep data yet. Log your first night to see insights.';
  }

  const durations = sleepData.map((s) => s.duration_minutes);
  const totalMinutes = durations.reduce((a, b) => a + b, 0);
  const avgMinutes = Math.round(totalMinutes / durations.length);
  const latestDuration = durations[0];

  const avgHours = Math.floor(avgMinutes / 60);
  const avgMins = avgMinutes % 60;
  const latestHours = Math.floor(latestDuration / 60);
  const latestMins = latestDuration % 60;

  const observations: string[] = [];
  if (avgHours < 6) {
    observations.push("You're getting less than 6 hours on average.");
  } else if (avgHours > 8) {
    observations.push("You're averaging over 8 hours \u2014 good recovery.");
  }
  if (durations.length >= 3) {
    const variance = Math.max(...durations) - Math.min(...durations);
    if (variance > 120) {
      observations.push('Your sleep varies quite a bit day to day.');
    }
  }

  let note = `Average ${avgHours}h ${avgMins}m this week. `;
  note += `Latest night: ${latestHours}h ${latestMins}m.`;
  if (observations.length > 0) note += ` ${observations[0]}`;
  return note;
}

export async function generateNote(
  sleepData: Array<{
    duration_minutes: number;
    sleep_start_utc: string;
    sleep_end_utc: string;
    timezone?: string;
  }>,
): Promise<{ note: string; isAI: boolean }> {
  return { note: generateRuleBasedNote(sleepData), isAI: false };
}

export default generateNote;
