import { API_BASE_URL } from "../config/api";

export interface HealthLog {
  id: string;
  user_id: string;
  log_date: string;
  sleep_minutes: number | null;
  weight_kg: number | null;
  calories: number | null;
  protein_g: number | null;
  steps: number | null;
  energy: number | null;
  mood: number | null;
  notes: Record<string, any>;
  privacy_level: string;
  created_at: string;
  updated_at: string;
}

export interface HealthLogUpsert {
  user_id: string;
  log_date?: string;
  sleep_minutes?: number | null;
  weight_kg?: number | null;
  calories?: number | null;
  protein_g?: number | null;
  steps?: number | null;
  energy?: number | null;
  mood?: number | null;
  notes?: Record<string, any> | null;
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
  return (await resp.json()) as T;
}

export async function healthToday(userId: string): Promise<HealthLog | null> {
  const qs = new URLSearchParams({ user_id: userId });
  const resp = await fetch(`${API_BASE_URL}/health/today?${qs.toString()}`);
  return handle<HealthLog | null>(resp);
}

export async function listHealth(
  userId: string,
  days = 30
): Promise<HealthLog[]> {
  const qs = new URLSearchParams({ user_id: userId, days: String(days) });
  const resp = await fetch(`${API_BASE_URL}/health?${qs.toString()}`);
  return handle<HealthLog[]>(resp);
}

export async function upsertHealth(
  payload: HealthLogUpsert
): Promise<HealthLog> {
  const resp = await fetch(`${API_BASE_URL}/health`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<HealthLog>(resp);
}

export interface HealthFieldStat {
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export interface HealthStats {
  sample_count: number;
  days_covered: number;
  sleep_minutes: HealthFieldStat;
  steps: HealthFieldStat;
  weight_kg: HealthFieldStat;
  mood: HealthFieldStat;
  energy: HealthFieldStat;
}

export interface HealthInsight {
  days: number;
  stats: HealthStats;
  summary: string;
  patterns: string[];
  suggestions: string[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function healthInsight(
  userId: string,
  days = 14
): Promise<HealthInsight> {
  const resp = await fetch(`${API_BASE_URL}/agents/health`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, days }),
  });
  return handle<HealthInsight>(resp);
}
