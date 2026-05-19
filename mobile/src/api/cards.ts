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
  do_not_do: string[];
  insight: string | null;
  used_ai: boolean;
  candidate_count: number;
  audit_log_id: string | null;
  error: string | null;
}

export async function pickFocus(
  userId: string,
  energy: EnergyLevel,
  mood?: number | null
): Promise<FocusResponse> {
  const body: Record<string, unknown> = { user_id: userId, energy };
  if (mood != null) body.mood = mood;
  const resp = await fetch(`${API_BASE_URL}/agents/focus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle<FocusResponse>(resp);
}

// ---------------------------------------------------------------------
// Intake Filter Agent — scores a card against the 7 mission questions
// ---------------------------------------------------------------------
export interface MissionScores {
  happiness: number;
  hidden_rules: number;
  clarity: number;
  freedom: number;
  self_refinement: number;
  chosen_solitude: number;
  meaning: number;
}

export interface FilterResponse {
  scores: MissionScores;
  total: number;
  want_type: string;
  decision: string;
  reasoning: string;
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function filterCard(
  userId: string,
  cardId?: string,
  title?: string,
  description?: string
): Promise<FilterResponse> {
  const body: Record<string, unknown> = { user_id: userId };
  if (cardId) body.card_id = cardId;
  if (title) body.title = title;
  if (description) body.description = description;
  const resp = await fetch(`${API_BASE_URL}/agents/filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle<FilterResponse>(resp);
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
export type ReviewWindow = "daily" | "weekly" | "monthly" | "yearly";

export interface ReviewStats {
  completed: number;
  created: number;
  in_progress: number;
  moved: number;
  by_status: Record<string, number>;
  habits_done: number;
  habits_missed: number;
  avg_energy: number | null;
  avg_mood: number | null;
  avg_sleep_hrs: number | null;
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

// ---------------------------------------------------------------------
// Mission Editor
// ---------------------------------------------------------------------
export interface MissionQuestion {
  key: string;
  question: string;
}

export interface MissionData {
  statement: string;
  questions: MissionQuestion[];
}

export async function getMission(userId: string): Promise<MissionData> {
  const resp = await fetch(`${API_BASE_URL}/agents/mission/${userId}`);
  return handle<MissionData>(resp);
}

export async function updateMission(
  userId: string,
  data: MissionData
): Promise<MissionData> {
  const resp = await fetch(`${API_BASE_URL}/agents/mission/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handle<MissionData>(resp);
}

// ---------------------------------------------------------------------
// Agent Council — "what should I do today?"
// ---------------------------------------------------------------------
export interface CouncilVote {
  agent: string;
  recommendation: string;
}

export interface CouncilResponse {
  votes: CouncilVote[];
  synthesis: string;
  used_ai: boolean;
}

export async function askCouncil(userId: string): Promise<CouncilResponse> {
  const resp = await fetch(`${API_BASE_URL}/agents/council`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return handle<CouncilResponse>(resp);
}
