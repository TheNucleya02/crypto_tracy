import { supabase } from "@/lib/supabase";
import type { PortfolioEntry, ChatThread, ChatMessage } from "@/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "crypto_assistant_token";

function handleList<T>(fn: () => Promise<{ data: T | null; error: unknown }>): Promise<T> {
  return fn().then(({ data, error }) => {
    if (error) throw error;
    return (data ?? []) as T;
  });
}

function getAccessToken() {
  return window.localStorage.getItem(TOKEN_KEY);
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

function hasBackendSession() {
  return Boolean(getAccessToken());
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

export function logout() {
  window.localStorage.removeItem(TOKEN_KEY);
}

// ---------- Portfolio ----------
const PORTFOLIO_TBL = "portfolio_entries";

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
  if (hasBackendSession()) {
    const data = await apiFetch<{ portfolio: BackendPortfolioEntry[] }>("/portfolio");
    return data.portfolio.map(fromBackendPortfolio);
  }

  const { data, error } = await supabase
    .from(PORTFOLIO_TBL)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PortfolioEntry[];
}

export async function addPortfolioEntry(input: {
  coin_id: string;
  symbol: string;
  name: string;
  image?: string;
  amount: number;
  buy_price: number;
}): Promise<PortfolioEntry> {
  if (hasBackendSession()) {
    const data = await apiFetch<{ data: BackendPortfolioEntry }>("/portfolio/add", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return fromBackendPortfolio(data.data);
  }

  const { data, error } = await supabase
    .from(PORTFOLIO_TBL)
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data as PortfolioEntry;
}

export async function deletePortfolioEntry(id: string): Promise<void> {
  if (hasBackendSession()) {
    await apiFetch(`/portfolio/${id}`, { method: "DELETE" });
    return;
  }

  const { error } = await supabase.from(PORTFOLIO_TBL).delete().eq("id", id);
  if (error) throw error;
}

// ---------- Chat threads ----------
const THREADS_TBL = "chat_threads";
const MESSAGES_TBL = "chat_messages";

export async function fetchThreads(): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from(THREADS_TBL)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ChatThread[]) ?? [];
}

export async function createThread(title: string): Promise<ChatThread> {
  const { data, error } = await supabase
    .from(THREADS_TBL)
    .insert([{ title }])
    .select()
    .single();
  if (error) throw error;
  return data as ChatThread;
}

export async function deleteThread(id: string): Promise<void> {
  const { error } = await supabase.from(THREADS_TBL).delete().eq("id", id);
  if (error) throw error;
}

export async function renameThread(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from(THREADS_TBL)
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function resetThread(id: string, title: string): Promise<void> {
  await supabase.from(MESSAGES_TBL).delete().eq("thread_id", id);
  await supabase
    .from(THREADS_TBL)
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from(MESSAGES_TBL)
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ChatMessage[]) ?? [];
}

export async function addMessage(
  threadId: string,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from(MESSAGES_TBL)
    .insert([{ thread_id: threadId, role, content }])
    .select()
    .single();
  if (error) throw error;
  // bump thread updated_at
  await supabase
    .from(THREADS_TBL)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
  return data as ChatMessage;
}
