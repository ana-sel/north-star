/**
 * Wearables bulk-import API client.
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

export interface WearableDay {
  log_date: string;            // YYYY-MM-DD
  sleep_minutes?: number | null;
  steps?: number | null;
  weight_kg?: number | null;
  calories?: number | null;
  bedtime?: string | null;     // "HH:MM"
  wake_time?: string | null;
}

export interface WearableImport {
  user_id: string;
  source: string;
  days: WearableDay[];
}

export interface WearableImportResult {
  source: string;
  created: number;
  updated: number;
}

export async function importWearables(
  payload: WearableImport
): Promise<WearableImportResult> {
  const resp = await fetch(`${API_BASE_URL}/wearables/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<WearableImportResult>(resp);
}
