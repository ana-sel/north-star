import { DOING_RETURNS, REFLECTION_RETURNS, WATCHING_RETURNS } from '@data/journeyRules';
import type { PathProgress } from '@data/paths';

export interface JourneyBuckets {
  active: PathProgress[];
  resting: PathProgress[];
}

export interface JourneyStageInfo {
  stage: 1 | 2 | 3;
  stageLabel: 'Watching' | 'Doing' | 'Under pressure';
  nextThreshold: number | null;
  segmentProgress: number;
  totalProgress: number;
  reflectionOpen: boolean;
}

const HIDDEN_IN_BROWSE = new Set(['active', 'resting', 'integrated']);

export function groupJourneysForDisplay(progressRows: PathProgress[]): JourneyBuckets {
  const active = progressRows
    .filter((row) => row.status === 'active')
    .sort(compareStartedAt);

  const resting = progressRows
    .filter((row) => row.status === 'resting')
    .sort(compareStartedAt);

  return { active, resting };
}

export function featuredBrowsePathIds(featuredPathIds: readonly string[], progressRows: PathProgress[]): string[] {
  const hidden = new Set(
    progressRows
      .filter((row) => row.journey_type === 'path' && HIDDEN_IN_BROWSE.has(row.status))
      .map((row) => row.path_id),
  );
  return featuredPathIds.filter((pathId) => !hidden.has(pathId));
}

export function stageInfoForReturns(returnCount: number): JourneyStageInfo {
  const returns = Math.max(0, returnCount);

  if (returns < WATCHING_RETURNS) {
    return {
      stage: 1,
      stageLabel: 'Watching',
      nextThreshold: WATCHING_RETURNS,
      segmentProgress: clamp01(returns / WATCHING_RETURNS),
      totalProgress: clamp01(returns / REFLECTION_RETURNS),
      reflectionOpen: false,
    };
  }

  if (returns < DOING_RETURNS) {
    return {
      stage: 2,
      stageLabel: 'Doing',
      nextThreshold: DOING_RETURNS,
      segmentProgress: clamp01((returns - WATCHING_RETURNS) / (DOING_RETURNS - WATCHING_RETURNS)),
      totalProgress: clamp01(returns / REFLECTION_RETURNS),
      reflectionOpen: false,
    };
  }

  if (returns < REFLECTION_RETURNS) {
    return {
      stage: 3,
      stageLabel: 'Under pressure',
      nextThreshold: REFLECTION_RETURNS,
      segmentProgress: clamp01((returns - DOING_RETURNS) / (REFLECTION_RETURNS - DOING_RETURNS)),
      totalProgress: clamp01(returns / REFLECTION_RETURNS),
      reflectionOpen: false,
    };
  }

  return {
    stage: 3,
    stageLabel: 'Under pressure',
    nextThreshold: null,
    segmentProgress: 1,
    totalProgress: 1,
    reflectionOpen: true,
  };
}

function compareStartedAt(a: PathProgress, b: PathProgress): number {
  return a.started_at.localeCompare(b.started_at);
}

/** The five ways a journey page can look. */
export type JourneyView = 'new' | 'walking' | 'reflection' | 'paused' | 'steady';

export function journeyView(status: PathProgress['status'] | null, returns: number): JourneyView {
  if (status === 'resting') return 'paused';
  if (status === 'integrated') return 'steady';
  if (status === 'active') return returns >= REFLECTION_RETURNS ? 'reflection' : 'walking';
  return 'new';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One sentence under the route: where you are and what opens next. Never a percentage or a deadline. */
export function journeyProgressLine(view: JourneyView, returns: number): string {
  if (view === 'steady') return `${plural(returns, 'return', 'returns')}. Steady is yours, and there is nothing to keep up.`;
  if (view === 'paused') return `Paused at ${plural(returns, 'return', 'returns')}. Resume whenever you like; nothing is lost.`;
  if (view === 'new' || returns === 0) return 'Starts with Watching: three returns of only noticing.';
  if (returns < WATCHING_RETURNS) {
    return `Camp 1 · Watching · ${plural(returns, 'return', 'returns')}. ${plural(WATCHING_RETURNS - returns, 'more opens', 'more open')} Doing.`;
  }
  if (returns < DOING_RETURNS) {
    return `Camp 2 · Doing · ${returns} returns. ${plural(DOING_RETURNS - returns, 'more opens', 'more open')} Under pressure.`;
  }
  if (returns < REFLECTION_RETURNS) return `Camp 3 · Under pressure · ${returns} returns. Reflection opens at ${REFLECTION_RETURNS}.`;
  return `Camp 3 · Under pressure · ${returns} returns. The whole route is walked.`;
}

/** At most three featured paths in one domain that the person is not already walking, resting or holding. */
export function suggestedPathIds(
  domain: string,
  featuredPathIds: readonly string[],
  domainOf: (pathId: string) => string,
  progressRows: PathProgress[],
  limit = 3,
): string[] {
  return featuredBrowsePathIds(featuredPathIds, progressRows).filter((id) => domainOf(id) === domain).slice(0, limit);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "today", "yesterday", or "Wednesday 14 October" for a stored local date. */
export function returnDayLabel(localDate: string, todayLocalDate: string): string {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const days = Math.round((toUtc(todayLocalDate) - toUtc(localDate)) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  const [, m, d] = localDate.split('-').map(Number);
  return `${WEEKDAYS[new Date(toUtc(localDate)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

export interface ReturnDay {
  localDate: string;
  label: string;
  /** Set on the return that opened a camp or the reflection. */
  milestone: string | null;
}

export interface ReturnMonth {
  title: string;
  days: ReturnDay[];
}

const MILESTONES: Record<number, string> = {
  [WATCHING_RETURNS]: 'Camp 2 · Doing opened',
  [DOING_RETURNS]: 'Camp 3 · Under pressure opened',
  [REFLECTION_RETURNS]: 'Reflection opened',
};

/** Returns grouped by month, newest first; local dates are calendar days, so no timezone maths is needed. */
export function groupReturnsByMonth(localDates: string[]): ReturnMonth[] {
  const oldestFirst = [...new Set(localDates)].sort();
  const days = oldestFirst.map((localDate, index) => {
    const [y, m, d] = localDate.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return { localDate, label: `${weekday} ${d}`, milestone: MILESTONES[index + 1] ?? null, month: `${MONTHS[m - 1]} ${y}` };
  });
  const months: ReturnMonth[] = [];
  for (const day of days.reverse()) {
    const last = months[months.length - 1];
    const entry = { localDate: day.localDate, label: day.label, milestone: day.milestone };
    if (last && last.title === day.month) last.days.push(entry);
    else months.push({ title: day.month, days: [entry] });
  }
  return months;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
