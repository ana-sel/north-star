/**
 * Audit log API client — read-only access to AI audit records.
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

export interface AuditLogOut {
  id: string;
  agent_id: string;
  privacy_level: string;
  provider: string;
  model: string;
  request_type: string;
  external_call: boolean;
  approval_required: boolean;
  approved_by_user: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_gbp: string;
  final_status: string;
  created_at: string;
}

export interface AuditSummary {
  total_requests: number;
  external_calls: number;
  local_calls: number;
  approvals_required: number;
  approvals_granted: number;
  total_cost_gbp: string;
  by_agent: Record<string, number>;
}

export async function listAuditLogs(
  userId: string,
  limit = 50,
  offset = 0,
  agentId?: string
): Promise<AuditLogOut[]> {
  const params = new URLSearchParams({
    user_id: userId,
    limit: String(limit),
    offset: String(offset),
  });
  if (agentId) params.set("agent_id", agentId);
  const resp = await fetch(`${API_BASE_URL}/audit?${params}`);
  return handle<AuditLogOut[]>(resp);
}

export async function getAuditSummary(userId: string): Promise<AuditSummary> {
  const params = new URLSearchParams({ user_id: userId });
  const resp = await fetch(`${API_BASE_URL}/audit/summary?${params}`);
  return handle<AuditSummary>(resp);
}

export interface AgentBudgetRow {
  agent_id: string;
  display_name: string;
  daily_limit_gbp: string | null;
  daily_spend_gbp: string;
  monthly_limit_gbp: string | null;
  monthly_spend_gbp: string;
}

export interface BudgetReport {
  global_daily_limit_gbp: string;
  global_daily_spend_gbp: string;
  global_monthly_limit_gbp: string;
  global_monthly_spend_gbp: string;
  by_agent: AgentBudgetRow[];
}

export async function getBudgetReport(userId: string): Promise<BudgetReport> {
  const params = new URLSearchParams({ user_id: userId });
  const resp = await fetch(`${API_BASE_URL}/audit/budget?${params}`);
  return handle<BudgetReport>(resp);
}
