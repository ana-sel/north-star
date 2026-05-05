/**
 * Approval API client. Mirrors the FastAPI endpoints in
 * `backend/app/api/approvals.py`.
 *
 * No auth headers yet (JWT lands later). All requests go through the
 * gateway-protected backend; this file only deals with the redacted
 * approval queue.
 */
import { API_BASE_URL } from "../config/api";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "executed";

export interface ApprovalListItem {
  id: string;
  agent_id: string;
  request_type: string;
  privacy_level: string;
  provider: string;
  model: string;
  status: ApprovalStatus;
  estimated_cost_gbp: string;
  expires_at: string;
  created_at: string;
}

export interface ApprovalDetail extends ApprovalListItem {
  redacted_prompt: string;
  redaction_map: Record<string, string>;
  max_output_tokens: number;
}

export interface GatewayResponse {
  audit_log_id: string;
  final_status: string;
  provider: string;
  model: string;
  external_call: boolean;
  text?: string | null;
  error?: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_gbp: string;
}

async function handle<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detail = `${resp.status} ${resp.statusText}`;
    try {
      const body = await resp.json();
      if (body?.detail) detail = `${resp.status}: ${body.detail}`;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  // 204s have no body.
  if (resp.status === 204) return undefined as unknown as T;
  return (await resp.json()) as T;
}

export async function listApprovals(
  userId: string,
  status: ApprovalStatus = "pending"
): Promise<ApprovalListItem[]> {
  const url = `${API_BASE_URL}/approvals?user_id=${encodeURIComponent(
    userId
  )}&status=${status}`;
  const resp = await fetch(url);
  return handle<ApprovalListItem[]>(resp);
}

export async function getApproval(id: string): Promise<ApprovalDetail> {
  const resp = await fetch(`${API_BASE_URL}/approvals/${id}`);
  return handle<ApprovalDetail>(resp);
}

export async function approveApproval(id: string): Promise<GatewayResponse> {
  const resp = await fetch(`${API_BASE_URL}/approvals/${id}/approve`, {
    method: "POST",
  });
  return handle<GatewayResponse>(resp);
}

export async function rejectApproval(id: string): Promise<void> {
  const resp = await fetch(`${API_BASE_URL}/approvals/${id}/reject`, {
    method: "POST",
  });
  await handle<void>(resp);
}
