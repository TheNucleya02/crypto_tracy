import { supabase } from "@/lib/supabase";
import type { PortfolioEntry, ChatThread, ChatMessage } from "@/types";

function handleList<T>(fn: () => Promise<{ data: T | null; error: unknown }>): Promise<T> {
  return fn().then(({ data, error }) => {
    if (error) throw error;
    return (data ?? []) as T;
  });
}

// ---------- Portfolio ----------
const PORTFOLIO_TBL = "portfolio_entries";

export async function fetchPortfolio(): Promise<PortfolioEntry[]> {
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
  const { data, error } = await supabase
    .from(PORTFOLIO_TBL)
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data as PortfolioEntry;
}

export async function deletePortfolioEntry(id: string): Promise<void> {
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
