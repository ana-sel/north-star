import { API_BASE_URL } from "../config/api";

export type EnergyLevel = "low" | "medium" | "high";

export interface EnergyLog {
  id: string;
  user_id: string;
  level: EnergyLevel;
  notes: string | null;
  logged_at: string;
  created_at: string;
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

export async function logEnergy(
  userId: string,
  level: EnergyLevel,
  notes?: string
): Promise<EnergyLog> {
  const resp = await fetch(`${API_BASE_URL}/energy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, level, notes: notes ?? null }),
  });
  return handle<EnergyLog>(resp);
}

export async function listEnergy(
  userId: string,
  days = 14
): Promise<EnergyLog[]> {
  const qs = new URLSearchParams({
    user_id: userId,
    days: String(days),
  });
  const resp = await fetch(`${API_BASE_URL}/energy?${qs.toString()}`);
  return handle<EnergyLog[]>(resp);
}

export async function latestEnergy(
  userId: string
): Promise<EnergyLog | null> {
  const qs = new URLSearchParams({ user_id: userId });
  const resp = await fetch(`${API_BASE_URL}/energy/latest?${qs.toString()}`);
  return handle<EnergyLog | null>(resp);
}
