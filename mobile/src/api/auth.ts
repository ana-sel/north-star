import { API_BASE_URL } from "../config/api";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function loginApi(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Login failed");
    throw new Error(detail);
  }
  return res.json();
}

export async function registerApi(
  email: string,
  password: string,
  displayName?: string
): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Registration failed");
    throw new Error(detail);
  }
  return res.json();
}
