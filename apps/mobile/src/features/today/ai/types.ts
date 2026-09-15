/** Canonical mobile AI boundary types (Phase 3C). Wire shapes only. */

export type AIPace = 'full' | 'lighter' | 'rest';
export type AIJourneyType = 'path' | 'foundation';
export type AIJourneyStage = 'watching' | 'doing' | 'under_pressure';

export interface TodayAIContext {
  localDate: string;
  pace: AIPace;

  sleep: {
    logged: boolean;
    durationMinutes?: number;
    targetMinutes?: number;
  };

  habits: {
    scheduled: number;
    completed: number;
    morningScheduled: number;
    morningCompleted: number;
    eveningScheduled: number;
    eveningCompleted: number;
  };

  plan: {
    dueToday: number;
    completedToday: number;
  };

  journey?: {
    id: string;
    type: AIJourneyType;
    title: string;
    stage: AIJourneyStage;
    practice: string;
  };
}

export interface TodayAIInsight {
  observation: string;
  orientation?: string;
}
