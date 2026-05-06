import { API_BASE_URL } from "../config/api";

export interface MoneyTxn {
  id: string;
  user_id: string;
  txn_date: string;
  amount: string; // Decimal serialised as string
  currency: string;
  category: string | null;
  description: string | null;
  privacy_level: string;
  created_at: string;
}

export interface MoneyTxnCreate {
  user_id: string;
  amount: string | number;
  txn_date?: string;
  currency?: string;
  category?: string | null;
  description?: string | null;
}

export interface CategoryTotal {
  category: string;
  total: string;
  count: number;
}

export interface MoneySummary {
  period_days: number;
  income: string;
  expenses: string;
  net: string;
  by_category: CategoryTotal[];
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

export async function listTransactions(
  userId: string,
  days = 30,
  category?: string
): Promise<MoneyTxn[]> {
  const qs = new URLSearchParams({ user_id: userId, days: String(days) });
  if (category) qs.set("category", category);
  const resp = await fetch(`${API_BASE_URL}/money?${qs.toString()}`);
  return handle<MoneyTxn[]>(resp);
}

export async function moneySummary(
  userId: string,
  days = 30
): Promise<MoneySummary> {
  const qs = new URLSearchParams({ user_id: userId, days: String(days) });
  const resp = await fetch(`${API_BASE_URL}/money/summary?${qs.toString()}`);
  return handle<MoneySummary>(resp);
}

export async function createTransaction(
  payload: MoneyTxnCreate
): Promise<MoneyTxn> {
  const resp = await fetch(`${API_BASE_URL}/money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, amount: String(payload.amount) }),
  });
  return handle<MoneyTxn>(resp);
}

export async function deleteTransaction(txnId: string): Promise<void> {
  const resp = await fetch(`${API_BASE_URL}/money/${txnId}`, {
    method: "DELETE",
  });
  return handle<void>(resp);
}

export interface MoneyAgentCategory {
  category: string;
  total: number;
  count: number;
}

export interface MoneyStats {
  txn_count: number;
  income: number;
  expenses: number;
  net: number;
  top_categories: MoneyAgentCategory[];
}

export interface MoneyInsight {
  days: number;
  stats: MoneyStats;
  summary: string;
  patterns: string[];
  suggestions: string[];
  used_ai: boolean;
  audit_log_id: string | null;
  error: string | null;
}

export async function moneyInsight(
  userId: string,
  days = 30
): Promise<MoneyInsight> {
  const resp = await fetch(`${API_BASE_URL}/agents/money`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, days }),
  });
  return handle<MoneyInsight>(resp);
}
