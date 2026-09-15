import { isHabitScheduledOnDate } from '@data/habitRules';
import type {
  AIJourneyStage,
  AIJourneyType,
  AIPace,
  TodayAIContext,
} from './types';

export interface AIHabitInput {
  id: string;
  ritual: 'morning' | 'evening' | 'none';
  cadence: 'daily' | 'weekdays' | 'custom';
  days_mask: number | null;
  completed: boolean;
}

export interface AIJourneyInput {
  /** May arrive namespaced as `foundation:<id>`; stripped on the wire. */
  pathId: string;
  type: AIJourneyType;
  title: string;
  camp: 1 | 2 | 3;
  practice: string;
}

export interface TodayAISource {
  localDate: string;
  pace: AIPace;
  sleepDurationMinutes: number | null;
  sleepTargetMinutes: number | null;
  habits: AIHabitInput[];
  planDueToday: number;
  planCompletedToday: number;
  journey: AIJourneyInput | null;
}

const CAMP_TO_STAGE: Record<1 | 2 | 3, AIJourneyStage> = {
  1: 'watching',
  2: 'doing',
  3: 'under_pressure',
};

/**
 * Pure builder — only approved structured fields. No task/habit titles, no
 * notes, no free text, no history. Journey title/practice are canonical app
 * content, so they are allowed.
 */
export function buildTodayAIContext(source: TodayAISource): TodayAIContext {
  let scheduled = 0;
  let completed = 0;
  let morningScheduled = 0;
  let morningCompleted = 0;
  let eveningScheduled = 0;
  let eveningCompleted = 0;

  for (const habit of source.habits) {
    if (!isHabitScheduledOnDate(habit, source.localDate)) continue;
    scheduled += 1;
    if (habit.completed) completed += 1;
    if (habit.ritual === 'morning') {
      morningScheduled += 1;
      if (habit.completed) morningCompleted += 1;
    } else if (habit.ritual === 'evening') {
      eveningScheduled += 1;
      if (habit.completed) eveningCompleted += 1;
    }
    // 'none'/anytime contributes only to the overall totals, never subsets.
  }

  const context: TodayAIContext = {
    localDate: source.localDate,
    pace: source.pace,
    sleep: { logged: source.sleepDurationMinutes != null },
    habits: {
      scheduled,
      completed,
      morningScheduled,
      morningCompleted,
      eveningScheduled,
      eveningCompleted,
    },
    plan: {
      dueToday: source.planDueToday,
      completedToday: source.planCompletedToday,
    },
  };

  if (source.sleepDurationMinutes != null) {
    context.sleep.durationMinutes = source.sleepDurationMinutes;
  }
  if (source.sleepTargetMinutes != null) {
    context.sleep.targetMinutes = source.sleepTargetMinutes;
  }

  if (source.journey) {
    context.journey = {
      id: source.journey.pathId.replace(/^foundation:/, ''),
      type: source.journey.type,
      title: source.journey.title,
      stage: CAMP_TO_STAGE[source.journey.camp],
      practice: source.journey.practice,
    };
  }

  return context;
}
