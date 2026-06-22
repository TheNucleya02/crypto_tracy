export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  circulating_supply: number;
  total_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  sparkline_in_7d: { price: number[] };
  high_24h: number;
  low_24h: number;
}

export interface PortfolioEntry {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  buy_price: number;
  image?: string;
  created_at: string;
}

export interface EnrichedHolding extends PortfolioEntry {
  current_price: number;
  invested_value: number;
  current_value: number;
  profit_loss: number;
  profit_loss_pct: number;
  allocation: number;
  sparkline: number[];
  price_change_24h: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  image?: string;
  sentiment: "positive" | "neutral" | "negative";
  tickers: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages?: ChatMessage[];
  created_at: string;
  updated_at?: string;
}

export interface MarketSentiment {
  value: number;
  classification: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  yesterday: number;
  last_week: number;
  last_month: number;
  history: { timestamp: string; value: number; classification: string }[];
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
  score: number;
}

export interface AIInsightCard {
  ticker: string;
  title: string;
  summary: string;
  prediction: "bullish" | "bearish" | "neutral";
  confidence: number;
}

export type SortKey =
  | "name"
  | "current_price"
  | "market_cap"
  | "total_volume"
  | "price_change_percentage_24h"
  | "market_cap_rank";
