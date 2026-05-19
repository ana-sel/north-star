/**
 * Calendar feed API client (read-only ICS pull-through).
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

export interface CalendarEvent {
  uid: string;
  summary: string;
  start: string;       // ISO datetime
  end: string | null;
  all_day: boolean;
  location: string | null;
  description: string | null;
}

export interface CalendarFeed {
  source: string;
  events: CalendarEvent[];
}

export async function getCalendarFeed(
  icsUrl: string,
  days = 14
): Promise<CalendarFeed> {
  const params = new URLSearchParams({ url: icsUrl, days: String(days) });
  const resp = await fetch(`${API_BASE_URL}/calendar/ics?${params}`);
  return handle<CalendarFeed>(resp);
}

// --- Stored (per-user, encrypted at rest) ICS URL ----------------------
//
// Requires an authenticated user (Authorization: Bearer <jwt>). Mobile
// auth wiring is not yet in place — these helpers are ready for once it
// is. See TODO.md.

export interface CalendarSettings {
  ics_url_set: boolean;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` } as const;
}

export async function getCalendarSettings(token: string): Promise<CalendarSettings> {
  const resp = await fetch(`${API_BASE_URL}/calendar/settings`, {
    headers: authHeader(token),
  });
  return handle<CalendarSettings>(resp);
}

export async function putCalendarSettings(
  token: string,
  icsUrl: string | null
): Promise<CalendarSettings> {
  const resp = await fetch(`${API_BASE_URL}/calendar/settings`, {
    method: "PUT",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ics_url: icsUrl }),
  });
  return handle<CalendarSettings>(resp);
}

export async function getStoredCalendarFeed(
  token: string,
  days = 14
): Promise<CalendarFeed> {
  const params = new URLSearchParams({ days: String(days) });
  const resp = await fetch(`${API_BASE_URL}/calendar/ics-stored?${params}`, {
    headers: authHeader(token),
  });
  return handle<CalendarFeed>(resp);
}
