import { API_BASE_URL } from "../config/api";

export type HabitKind = "yes_no" | "number" | "scale" | "time" | "text";

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  kind: HabitKind;
  target_value: number | null;
  target_unit: string | null;
  schedule: string;
  active: boolean;
  privacy_level: string;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  value_bool: boolean | null;
  value_number: number | null;
  value_text: string | null;
  notes: string | null;
  created_at: string;
}

export interface HabitWithToday {
  habit: Habit;
  today: HabitLog | null;
}

export interface HabitCreate {
  user_id: string;
  title: string;
  kind?: HabitKind;
  target_value?: number | null;
  target_unit?: string | null;
  schedule?: string;
}

export interface HabitCheckIn {
  user_id: string;
  log_date?: string;
  value_bool?: boolean | null;
  value_number?: number | null;
  value_text?: string | null;
  notes?: string | null;
}

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
  if (resp.status === 204) return undefined as unknown as T;
  return (await resp.json()) as T;
}

export async function listHabits(
  userId: string,
  includeInactive = false
): Promise<Habit[]> {
  const qs = new URLSearchParams({
    user_id: userId,
    include_inactive: String(includeInactive),
  });
  const resp = await fetch(`${API_BASE_URL}/habits?${qs.toString()}`);
  return handle<Habit[]>(resp);
}

export async function habitsToday(userId: string): Promise<HabitWithToday[]> {
  const qs = new URLSearchParams({ user_id: userId });
  const resp = await fetch(`${API_BASE_URL}/habits/today?${qs.toString()}`);
  return handle<HabitWithToday[]>(resp);
}

export async function createHabit(payload: HabitCreate): Promise<Habit> {
  const resp = await fetch(`${API_BASE_URL}/habits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<Habit>(resp);
}

export async function updateHabit(
  habitId: string,
  patch: Partial<Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Habit> {
  const resp = await fetch(`${API_BASE_URL}/habits/${habitId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return handle<Habit>(resp);
}

export async function deleteHabit(habitId: string): Promise<void> {
  const resp = await fetch(`${API_BASE_URL}/habits/${habitId}`, {
    method: "DELETE",
  });
  return handle<void>(resp);
}

export async function checkInHabit(
  habitId: string,
  payload: HabitCheckIn
): Promise<HabitLog> {
  const resp = await fetch(`${API_BASE_URL}/habits/${habitId}/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<HabitLog>(resp);
}

// Weekly matrix data
export interface HabitWeekLog {
  log_date: string;
  value_bool: boolean | null;
  value_number: number | null;
  value_text: string | null;
}

export interface HabitWeekRow {
  habit: Habit;
  logs: Record<string, HabitWeekLog>; // keyed by ISO date
  streak: number;
}

export async function habitsWeek(
  userId: string,
  days = 7
): Promise<HabitWeekRow[]> {
  const qs = new URLSearchParams({ user_id: userId, days: String(days) });
  const resp = await fetch(`${API_BASE_URL}/habits/week?${qs.toString()}`);
  return handle<HabitWeekRow[]>(resp);
}
