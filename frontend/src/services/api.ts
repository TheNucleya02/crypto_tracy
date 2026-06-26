import type { AuthUser, PortfolioEntry, ChatThread, ChatMessage } from "@/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "crypto_assistant_token";

function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function hasStoredSession() {
  return Boolean(getAccessToken());
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const body = new URLSearchParams({ username, password });
  const response = await fetch(`${API_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Login failed");
  }
  const data = (await response.json()) as { access_token: string; token_type: string };
  window.localStorage.setItem(TOKEN_KEY, data.access_token);
  return data;
}

export async function register(input: {
  username: string;
  email: string;
  full_name: string;
  password: string;
}) {
  return apiFetch<AuthUser>("/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchCurrentUser() {
  if (!hasStoredSession()) return null;
  return apiFetch<AuthUser>("/users/me");
}

export function logout() {
  window.localStorage.removeItem(TOKEN_KEY);
}

// ---------- Portfolio ----------

type BackendPortfolioEntry = PortfolioEntry & {
  id: number;
  current_price?: number;
  invested_value?: number;
  current_value?: number;
  profit_loss?: number;
};

function fromBackendPortfolio(entry: BackendPortfolioEntry): PortfolioEntry {
  return {
    ...entry,
    id: String(entry.id),
    name: entry.name ?? entry.symbol,
    created_at: entry.created_at ?? new Date().toISOString(),
  };
}

export async function fetchPortfolio(): Promise<PortfolioEntry[]> {
  const data = await apiFetch<{ portfolio: BackendPortfolioEntry[] }>("/portfolio");
  return data.portfolio.map(fromBackendPortfolio);
}

export async function addPortfolioEntry(input: {
  coin_id: string;
  symbol: string;
  name: string;
  image?: string;
  amount: number;
  buy_price: number;
}): Promise<PortfolioEntry> {
  const data = await apiFetch<{ data: BackendPortfolioEntry }>("/portfolio/add", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return fromBackendPortfolio(data.data);
}

export async function deletePortfolioEntry(id: string): Promise<void> {
  await apiFetch(`/portfolio/${id}`, { method: "DELETE" });
}

// ---------- Chat (authenticated) ----------

export async function fetchThreads(): Promise<ChatThread[]> {
  const data = await apiFetch<Array<ChatThread>>("/chat/threads");
  return data.map((t) => ({
    ...t,
    id: String(t.id),
    created_at: t.created_at ?? new Date().toISOString(),
    updated_at: t.updated_at ?? t.created_at ?? new Date().toISOString(),
  }));
}

export async function createThread(title: string): Promise<ChatThread> {
  const data = await apiFetch<ChatThread>("/chat/threads", {
    method: "POST",
    body: JSON.stringify({ message: title }),
  });
  return {
    ...data,
    id: String(data.id),
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? data.created_at ?? new Date().toISOString(),
  };
}

export async function deleteThread(id: string): Promise<void> {
  await apiFetch(`/chat/threads/${id}`, { method: "DELETE" });
}

export async function resetThread(id: string, title: string): Promise<void> {
  await apiFetch(`/chat/threads/${id}/clear`, { method: "POST", body: JSON.stringify({ message: title }) });
}

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const data = await apiFetch<Array<ChatMessage>>(`/chat/threads/${threadId}/messages`);
  return data.map((m) => ({
    ...m,
    id: String(m.id),
    timestamp: m.created_at ?? new Date().toISOString(),
  }));
}

export async function sendChatMessage(
  threadId: string,
  message: string
): Promise<{ response: string; thread_id: number; message_id: number }> {
  return apiFetch(`/chat/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// ---------- Anonymous chat (no auth required) ----------

export async function sendAnonymousMessage(message: string): Promise<{ response: string }> {
  const response = await fetch(`${API_BASE_URL}/chat/anon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<{ response: string }>;
}
