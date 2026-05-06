import { API_BASE_URL } from "../config/api";

export type CardType =
  | "thought"
  | "goal"
  | "task"
  | "habit"
  | "health"
  | "money"
  | "diary"
  | "research"
  | "decision";

export type CardStatus =
  | "inbox"
  | "filtered"
  | "planned"
  | "in_progress_my_side"
  | "in_progress_other_side"
  | "today"
  | "done"
  | "later"
  | "deleted"
  | "review";

export type LifeArea =
  | "health_energy"
  | "mind_healing"
  | "money_freedom"
  | "work_skills"
  | "home_property"
  | "joy_culture"
  | "family"
  | null;

export interface CardOut {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  level: string;
  type: CardType;
  status: CardStatus;
  life_area: LifeArea;
  energy_required: string;
  priority: string;
  privacy_level: string;
  estimated_minutes: number | null;
  due_date: string | null;
  moved_count: number;
  mission_scores: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CardCreate {
  user_id: string;
  title: string;
  description?: string | null;
  type?: CardType;
  status?: CardStatus;
  life_area?: LifeArea;
  level?: string;
  parent_id?: string | null;
  privacy_level?: string;
}

export interface CaptureDraft {
  title: string;
  description: string | null;
  type: CardType;
  life_area: LifeArea;
  level: string;
  privacy_level: string;
}

export interface CaptureResponse {
  draft: CaptureDraft;
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

async function handle<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detail = `${resp.status} ${resp.statusText}`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = `${resp.status}: ${body.detail}`;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (resp.status === 204) return undefined as unknown as T;
  return (await resp.json()) as T;
}

export async function listCards(
  userId: string,
  status?: CardStatus,
  cardType?: CardType
): Promise<CardOut[]> {
  const qs = new URLSearchParams({ user_id: userId });
  if (status) qs.set("status", status);
  if (cardType) qs.set("card_type", cardType);
  const resp = await fetch(`${API_BASE_URL}/cards?${qs.toString()}`);
  return handle<CardOut[]>(resp);
}

export async function getCard(cardId: string): Promise<CardOut> {
  const resp = await fetch(`${API_BASE_URL}/cards/${cardId}`);
  return handle<CardOut>(resp);
}

// ---------------------------------------------------------------------
// Goal tree
// ---------------------------------------------------------------------
export interface CardTreeNode {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  level: string;
  type: CardType;
  status: CardStatus;
  life_area: LifeArea;
  energy_required: string;
  priority: string;
  moved_count: number;
  completed_at: string | null;
  children: CardTreeNode[];
}

export async function getCardTree(
  userId: string,
  includeTasks = false
): Promise<CardTreeNode[]> {
  const qs = new URLSearchParams({
    user_id: userId,
    include_tasks: String(includeTasks),
  });
  const resp = await fetch(`${API_BASE_URL}/cards/tree?${qs.toString()}`);
  return handle<CardTreeNode[]>(resp);
}

export async function createCard(payload: CardCreate): Promise<CardOut> {
  const resp = await fetch(`${API_BASE_URL}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<CardOut>(resp);
}

export interface CardUpdate {
  title?: string;
  description?: string | null;
  type?: CardType;
  status?: CardStatus;
  life_area?: LifeArea;
  energy_required?: "low" | "medium" | "high";
  priority?: "low" | "medium" | "high";
  privacy_level?: string;
  estimated_minutes?: number | null;
  due_date?: string | null;
  parent_id?: string | null;
}

export async function updateCard(
  cardId: string,
  patch: CardUpdate
): Promise<CardOut> {
  const resp = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return handle<CardOut>(resp);
}

export async function deleteCard(cardId: string): Promise<void> {
  const resp = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
    method: "DELETE",
  });
  await handle<void>(resp);
}

export async function captureThought(
  userId: string,
  text: string
): Promise<CaptureResponse> {
  const resp = await fetch(`${API_BASE_URL}/agents/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, text }),
  });
  return handle<CaptureResponse>(resp);
}

// ---------------------------------------------------------------------
// Focus Agent
// ---------------------------------------------------------------------
export type EnergyLevel = "low" | "medium" | "high";

export interface FocusPick {
  card_id: string;
  title: string;
  reason: string | null;
}

export interface FocusResponse {
  energy: EnergyLevel;
  picks: FocusPick[];
  used_ai: boolean;
  candidate_count: number;
  audit_log_id: string | null;
  error: string | null;
}

export async function pickFocus(
  userId: string,
  energy: EnergyLevel
): Promise<FocusResponse> {
  const resp = await fetch(`${API_BASE_URL}/agents/focus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, energy }),
  });
  return handle<FocusResponse>(resp);
}

// ---------------------------------------------------------------------
// Goal Architect Agent — splits a parent goal into 3-7 child suggestions
// at the next level down. Suggestions are NOT persisted; the caller
// turns approved ones into real cards via createCard.
// ---------------------------------------------------------------------
export interface ArchitectSuggestion {
  title: string;
  description: string | null;
  level: string;
}

export interface ArchitectResponse {
  parent_id: string;
  parent_level: string;
  child_level: string;
  suggestions: ArchitectSuggestion[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function architectGoal(
  userId: string,
  cardId: string
): Promise<ArchitectResponse> {
  const resp = await fetch(`${API_BASE_URL}/agents/architect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, card_id: cardId }),
  });
  return handle<ArchitectResponse>(resp);
}

// ---------------------------------------------------------------------
// Mission Agent — scores a card against the 7-question mission filter.
// Result is also persisted on the card's `mission_scores` field.
// ---------------------------------------------------------------------
export interface MissionFilterScore {
  score: number;
  note: string | null;
}

export interface MissionResponse {
  card_id: string;
  scores: Record<string, MissionFilterScore>;
  overall: number;
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function scoreMission(
  userId: string,
  cardId: string
): Promise<MissionResponse> {
  const resp = await fetch(`${API_BASE_URL}/agents/mission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, card_id: cardId }),
  });
  return handle<MissionResponse>(resp);
}

// ---------------------------------------------------------------------
// Review Agent — daily/weekly pattern detection over card activity.
// ---------------------------------------------------------------------
export type ReviewWindow = "daily" | "weekly";

export interface ReviewStats {
  completed: number;
  created: number;
  in_progress: number;
  moved: number;
  by_status: Record<string, number>;
}

export interface ReviewResponse {
  window: ReviewWindow;
  stats: ReviewStats;
  summary: string;
  wins: string[];
  patterns: string[];
  suggestions: string[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function runReview(
  userId: string,
  window: ReviewWindow
): Promise<ReviewResponse> {
  const resp = await fetch(`${API_BASE_URL}/agents/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, window }),
  });
  return handle<ReviewResponse>(resp);
}
