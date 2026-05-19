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
