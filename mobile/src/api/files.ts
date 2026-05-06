import { API_BASE_URL } from "../config/api";

export interface FileEntry {
  id: string;
  user_id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string | null;
  privacy_level: string;
  created_at: string;
  updated_at: string;
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

export async function listFiles(
  userId: string,
  category?: string
): Promise<FileEntry[]> {
  const qs = new URLSearchParams({ user_id: userId });
  if (category) qs.set("category", category);
  const resp = await fetch(`${API_BASE_URL}/files?${qs.toString()}`);
  return handle<FileEntry[]>(resp);
}

export async function uploadFile(
  userId: string,
  uri: string,
  filename: string,
  mimeType: string | null,
  category?: string | null
): Promise<FileEntry> {
  const form = new FormData();
  form.append("user_id", userId);
  if (category) form.append("category", category);
  // React Native FormData accepts {uri, name, type} blobs.
  // Cast to any because lib.dom's FormData type doesn't know.
  form.append("file", {
    uri,
    name: filename,
    type: mimeType ?? "application/octet-stream",
  } as any);

  const resp = await fetch(`${API_BASE_URL}/files`, {
    method: "POST",
    body: form,
  });
  return handle<FileEntry>(resp);
}

export async function deleteFile(
  fileId: string,
  userId: string
): Promise<void> {
  const qs = new URLSearchParams({ user_id: userId });
  const resp = await fetch(
    `${API_BASE_URL}/files/${fileId}?${qs.toString()}`,
    { method: "DELETE" }
  );
  return handle<void>(resp);
}

export function fileDownloadUrl(fileId: string, userId: string): string {
  const qs = new URLSearchParams({ user_id: userId });
  return `${API_BASE_URL}/files/${fileId}/download?${qs.toString()}`;
}
