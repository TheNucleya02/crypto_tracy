import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  COINS,
  TRENDING,
  FEAR_GREED,
  NEWS,
  AI_INSIGHTS,
  findCoin,
} from "@/services/marketData";
import {
  fetchPortfolio,
  addPortfolioEntry,
  deletePortfolioEntry,
  fetchThreads,
  createThread,
  deleteThread,
  fetchMessages,
  sendChatMessage,
  sendAnonymousMessage,
  resetThread,
  hasStoredSession,
} from "@/services/api";
import type { EnrichedHolding, ChatMessage, ChatThread } from "@/types";

const LS_THREADS_KEY = "anon_chat_threads";
const LS_MESSAGES_KEY = "anon_chat_messages";

function getLocalThreads(): ChatThread[] {
  const raw = window.localStorage.getItem(LS_THREADS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatThread[];
  } catch {
    return [];
  }
}

function setLocalThreads(threads: ChatThread[]) {
  window.localStorage.setItem(LS_THREADS_KEY, JSON.stringify(threads));
}

function getLocalMessages(threadId: string): ChatMessage[] {
  const raw = window.localStorage.getItem(LS_MESSAGES_KEY);
  if (!raw) return [];
  try {
    const map = JSON.parse(raw) as Record<string, ChatMessage[]>;
    return map[threadId] ?? [];
  } catch {
    return [];
  }
}

function setLocalMessages(threadId: string, messages: ChatMessage[]) {
  const raw = window.localStorage.getItem(LS_MESSAGES_KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
  map[threadId] = messages;
  window.localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(map));
}

function deleteLocalThread(id: string) {
  const threads = getLocalThreads().filter((t) => t.id !== id);
  setLocalThreads(threads);
  const raw = window.localStorage.getItem(LS_MESSAGES_KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {};
  delete map[id];
  window.localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(map));
}

// --- Market data (static seed, simulates CoinGecko API) ---
export function useCoins() {
  return useQuery({ queryKey: ["coins"], queryFn: () => COINS, staleTime: 60_000 });
}

export function useTrending() {
  return useQuery({ queryKey: ["trending"], queryFn: () => TRENDING, staleTime: 60_000 });
}

export function useSentiment() {
  return useQuery({
    queryKey: ["sentiment"],
    queryFn: () => FEAR_GREED,
    staleTime: 120_000,
  });
}

export function useNews() {
  return useQuery({ queryKey: ["news"], queryFn: () => NEWS, staleTime: 120_000 });
}

export function useAiInsights() {
  return useQuery({
    queryKey: ["ai-insights"],
    queryFn: () => AI_INSIGHTS,
    staleTime: 300_000,
  });
}

// --- Portfolio ---
export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
    staleTime: 30_000,
  });
}

export function useEnrichedHoldings() {
  const { data, isLoading, error, refetch } = usePortfolio();
  const enriched: EnrichedHolding[] = (data ?? []).map((e) => {
    const coin = findCoin(e.symbol);
    const current_price = coin?.current_price ?? e.buy_price;
    const invested_value = e.amount * e.buy_price;
    const current_value = e.amount * current_price;
    const profit_loss = current_value - invested_value;
    const profit_loss_pct = invested_value > 0 ? (profit_loss / invested_value) * 100 : 0;
    return {
      ...e,
      current_price,
      invested_value,
      current_value,
      profit_loss,
      profit_loss_pct,
      allocation: 0,
      sparkline: coin?.sparkline_in_7d.price ?? [],
      price_change_24h: coin?.price_change_percentage_24h ?? 0,
    };
  });
  const total = enriched.reduce((s, h) => s + h.invested_value, 0);
  const finalEnriched = enriched.map((h) => ({
    ...h,
    allocation: total > 0 ? (h.invested_value / total) * 100 : 0,
  }));
  return { data: finalEnriched, isLoading, error, refetch };
}

const PORTFOLIO_MUTATION_OPTS = {
  onSuccess: [
    ["portfolio"],
    ["portfolio-overview"],
  ] as const,
} as const;

function invalidatePortfolio(qc: QueryClientLike) {
  PORTFOLIO_MUTATION_OPTS.onSuccess.forEach((k) => qc.invalidateQueries({ queryKey: k }));
}

type QueryClientLike = { invalidateQueries: (opts: { queryKey: readonly string[] }) => void };

export function useAddPortfolioEntry() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: addPortfolioEntry,
    onSuccess: () => invalidatePortfolio(qc),
  });
}

export function useDeletePortfolioEntry() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: deletePortfolioEntry,
    onSuccess: () => invalidatePortfolio(qc),
  });
}

// --- Chat (auth or localStorage fallback) ---
export function useThreads() {
  return useQuery({
    queryKey: ["threads"],
    queryFn: () => {
      if (hasStoredSession()) return fetchThreads();
      return getLocalThreads();
    },
    staleTime: 30_000,
  });
}

export function useCreateThread() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: async (title: string) => {
      if (hasStoredSession()) return createThread(title);
      const id = `anon-${Date.now()}`;
      const now = new Date().toISOString();
      const thread: ChatThread = { id, title, created_at: now, updated_at: now };
      const threads = [thread, ...getLocalThreads()];
      setLocalThreads(threads);
      return thread;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: async (id: string) => {
      if (hasStoredSession()) return deleteThread(id);
      deleteLocalThread(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });
}

export function useClearThread() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: async (args: { id: string; title: string }) => {
      if (hasStoredSession()) return resetThread(args.id, args.title);
      const threads = getLocalThreads().map((t) =>
        t.id === args.id ? { ...t, title: args.title, updated_at: new Date().toISOString() } : t
      );
      setLocalThreads(threads);
      setLocalMessages(args.id, []);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.invalidateQueries({ queryKey: ["messages", vars.id] });
    },
  });
}

export function useMessages(threadId: string | null) {
  return useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => {
      if (hasStoredSession()) return fetchMessages(threadId!);
      return getLocalMessages(threadId!);
    },
    enabled: !!threadId,
    staleTime: 10_000,
  });
}

export function useSendChatMessage(threadId: string | null) {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: async (message: string) => {
      if (hasStoredSession()) return sendChatMessage(threadId!, message);
      const now = new Date().toISOString();
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: message, timestamp: now };
      const msgs = [...getLocalMessages(threadId!), userMsg];
      setLocalMessages(threadId!, msgs);

      const { response } = await sendAnonymousMessage(message);

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };
      setLocalMessages(threadId!, [...msgs, assistantMsg]);

      const threads = getLocalThreads().map((t) =>
        t.id === threadId ? { ...t, updated_at: new Date().toISOString() } : t
      );
      setLocalThreads(threads);

      return { response, thread_id: 0, message_id: 0 };
    },
    onSuccess: () => {
      if (threadId) {
        qc.invalidateQueries({ queryKey: ["messages", threadId] });
        qc.invalidateQueries({ queryKey: ["threads"] });
      }
    },
  });
}
