import { API_BASE_URL } from "../config/api";

export type DraftState = "new" | "accepted" | "dismissed" | "archived_insight";

export interface DraftRead {
  id: string;
  title: string;
  kind: string;
  state: DraftState;
  life_area: string | null;
  confidence: number;
  reason: string | null;
  source_text: string;
}

async function authed<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
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

export function listDrafts(token: string, state: DraftState | null = "new") {
  const qs = state ? `?state=${state}` : "";
  return authed<DraftRead[]>(token, `/drafts${qs}`);
}

export function acceptDraft(token: string, id: string) {
  return authed<DraftRead>(token, `/drafts/${id}/accept`, { method: "POST" });
}

export function dismissDraft(token: string, id: string) {
  return authed<DraftRead>(token, `/drafts/${id}/dismiss`, { method: "POST" });
}

export function archiveDraft(token: string, id: string) {
  return authed<DraftRead>(token, `/drafts/${id}/archive`, { method: "POST" });
}
