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

const ACTIVE_STATES = new Set(['active', 'resting']);
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

export function isJourneyVisibleInWalking(row: PathProgress): boolean {
  return ACTIVE_STATES.has(row.status);
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

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
