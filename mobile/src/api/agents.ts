/**
 * Cross-feature agent endpoints (later agents from spec §8 that don't
 * sit on top of one feature client). Energy/Health/Money insights live
 * in their own feature clients alongside their CRUD calls.
 */
import { API_BASE_URL } from "../config/api";

async function handle<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detail = `${resp.status} ${resp.statusText}`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = `${resp.status}: ${JSON.stringify(body.detail)}`;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await resp.json()) as T;
}

export interface ProductivityHabit {
  habit_id: string;
  title: string;
  logged_days: number;
  target_days: number;
}

export interface ProductivityStats {
  window_days: number;
  cards_created: number;
  cards_completed: number;
  cards_in_progress: number;
  completion_rate: number;
  avg_days_to_complete: number | null;
  habits: ProductivityHabit[];
}

export interface ProductivityInsight {
  days: number;
  stats: ProductivityStats;
  summary: string;
  patterns: string[];
  suggestions: string[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function productivityInsight(
  userId: string,
  days = 14
): Promise<ProductivityInsight> {
  const resp = await fetch(`${API_BASE_URL}/agents/productivity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, days }),
  });
  return handle<ProductivityInsight>(resp);
}

// --- Learning Agent ---

export interface LearningStats {
  window_days: number;
  learning_cards_total: number;
  learning_cards_created: number;
  learning_cards_completed: number;
  learning_cards_in_progress: number;
  learning_habits_active: number;
  learning_habit_logged_days: number;
}

export interface LearningInsight {
  days: number;
  stats: LearningStats;
  summary: string;
  patterns: string[];
  suggestions: string[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function learningInsight(
  userId: string,
  days = 30
): Promise<LearningInsight> {
  const resp = await fetch(`${API_BASE_URL}/agents/learning`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, days }),
  });
  return handle<LearningInsight>(resp);
}

// --- Healing Agent ---

export interface HealingStats {
  window_days: number;
  healing_cards_total: number;
  healing_cards_created: number;
  diary_entries_in_window: number;
  avg_mood: number | null;
  avg_energy: number | null;
  healing_habits_active: number;
  healing_habit_logged_days: number;
}

export interface HealingInsight {
  days: number;
  stats: HealingStats;
  summary: string;
  patterns: string[];
  suggestions: string[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function healingInsight(
  userId: string,
  days = 14
): Promise<HealingInsight> {
  const resp = await fetch(`${API_BASE_URL}/agents/healing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, days }),
  });
  return handle<HealingInsight>(resp);
}

// --- Research Agent ---

export interface ResearchStats {
  window_days: number;
  research_cards_total: number;
  research_cards_created: number;
  research_cards_completed: number;
  research_cards_in_progress: number;
}

export interface ResearchInsight {
  days: number;
  stats: ResearchStats;
  summary: string;
  patterns: string[];
  suggestions: string[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function researchInsight(
  userId: string,
  days = 30
): Promise<ResearchInsight> {
  const resp = await fetch(`${API_BASE_URL}/agents/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, days }),
  });
  return handle<ResearchInsight>(resp);
}
