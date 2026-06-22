import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  COINS,
  TRENDING,
  FEAR_GREED,
  NEWS,
  AI_INSIGHTS,
  AI_RESPONSES,
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
  addMessage,
  resetThread,
} from "@/services/api";
import type { EnrichedHolding } from "@/types";

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

// --- Chat ---
export function useThreads() {
  return useQuery({ queryKey: ["threads"], queryFn: fetchThreads, staleTime: 30_000 });
}

export function useCreateThread() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: createThread,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: deleteThread,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

export function useClearThread() {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: (args: { id: string; title: string }) => resetThread(args.id, args.title),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.invalidateQueries({ queryKey: ["messages", vars.id] });
    },
  });
}

export function useMessages(threadId: string | null) {
  return useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => fetchMessages(threadId!),
    enabled: !!threadId,
    staleTime: 10_000,
  });
}

export function useAddMessage(threadId: string | null) {
  const qc = useQueryClient() as unknown as QueryClientLike;
  return useMutation({
    mutationFn: ({ role, content }: { role: "user" | "assistant"; content: string }) =>
      addMessage(threadId!, role, content),
    onSuccess: () => {
      if (threadId) qc.invalidateQueries({ queryKey: ["messages", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

// --- AI chat response generator (simulates streaming from /summary/) ---
export function buildAIResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("btc") || p.includes("bitcoin")) return AI_RESPONSES.btc;
  if (p.includes("eth") || p.includes("ethereum")) return AI_RESPONSES.eth;
  if (p.includes("portfolio") || p.includes("holding") || p.includes("my position"))
    return AI_RESPONSES.portfolio;
  if (p.includes("market") || p.includes("sentiment") || p.includes("fear"))
    return AI_RESPONSES.market;
  return AI_RESPONSES.default;
}
