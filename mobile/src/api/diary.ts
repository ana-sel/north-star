/**
 * Diary API client — dedicated diary_entries CRUD.
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

export interface DiaryEntryOut {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  mood: string | null;
  privacy_level: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntryCreate {
  user_id: string;
  title?: string | null;
  body: string;
  mood?: string | null;
}

export interface DiaryEntryUpdate {
  title?: string | null;
  body?: string;
  mood?: string | null;
}

export async function listDiary(
  userId: string,
  limit = 50,
  offset = 0
): Promise<DiaryEntryOut[]> {
  const params = new URLSearchParams({
    user_id: userId,
    limit: String(limit),
    offset: String(offset),
  });
  const resp = await fetch(`${API_BASE_URL}/diary?${params}`);
  return handle<DiaryEntryOut[]>(resp);
}

export async function createDiary(
  payload: DiaryEntryCreate
): Promise<DiaryEntryOut> {
  const resp = await fetch(`${API_BASE_URL}/diary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<DiaryEntryOut>(resp);
}

export async function getDiary(entryId: string): Promise<DiaryEntryOut> {
  const resp = await fetch(`${API_BASE_URL}/diary/${entryId}`);
  return handle<DiaryEntryOut>(resp);
}

export async function updateDiary(
  entryId: string,
  payload: DiaryEntryUpdate
): Promise<DiaryEntryOut> {
  const resp = await fetch(`${API_BASE_URL}/diary/${entryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<DiaryEntryOut>(resp);
}

export async function deleteDiary(entryId: string): Promise<void> {
  const resp = await fetch(`${API_BASE_URL}/diary/${entryId}`, {
    method: "DELETE",
  });
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
}

/**
 * Run OCR on an image — local-only Ollama vision pass.
 * `image` is a React-Native-friendly file blob: { uri, name, type }.
 */
export async function ocrDiaryImage(image: {
  uri: string;
  name?: string;
  type?: string;
}): Promise<{ text: string }> {
  const form = new FormData();
  form.append("image", {
    uri: image.uri,
    name: image.name ?? "photo.jpg",
    type: image.type ?? "image/jpeg",
  } as any);
  const resp = await fetch(`${API_BASE_URL}/diary/ocr`, {
    method: "POST",
    body: form,
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
  return (await resp.json()) as { text: string };
}
