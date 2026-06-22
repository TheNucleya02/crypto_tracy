import type {
  Coin,
  NewsItem,
  MarketSentiment,
  TrendingCoin,
  AIInsightCard,
} from "@/types";

// --- Helpers for generating realistic sparklines ---
function sparkline(base: number, points = 168, volatility = 0.03): number[] {
  const out: number[] = [];
  let v = base * (1 - volatility * 2);
  for (let i = 0; i < points; i++) {
    const drift = (Math.random() - 0.45) * volatility * base;
    v = Math.max(v + drift, base * 0.5);
    out.push(+v.toFixed(2));
  }
  out.push(base);
  return out;
}

// --- Coin catalogue (mirrors CoinGecko /coins/markets response shape) ---
const COINS_SEED: Omit<Coin, "image" | "sparkline_in_7d">[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", current_price: 67432.18, market_cap: 1330e9, market_cap_rank: 1, total_volume: 28.4e9, price_change_percentage_24h: 2.43, price_change_percentage_7d: 5.21, circulating_supply: 19.73e6, total_supply: 21e6, ath: 73750, ath_change_percentage: -8.6, high_24h: 68100, low_24h: 65940 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", current_price: 3521.44, market_cap: 423e9, market_cap_rank: 2, total_volume: 15.2e9, price_change_percentage_24h: 1.87, price_change_percentage_7d: 3.94, circulating_supply: 120.3e6, total_supply: null, ath: 4878, ath_change_percentage: -27.8, high_24h: 3580, low_24h: 3440 },
  { id: "solana", symbol: "SOL", name: "Solana", current_price: 168.32, market_cap: 77.4e9, market_cap_rank: 5, total_volume: 3.8e9, price_change_percentage_24h: 4.12, price_change_percentage_7d: 8.43, circulating_supply: 460e6, total_supply: null, ath: 259, ath_change_percentage: -35.1, high_24h: 172, low_24h: 161 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", current_price: 612.77, market_cap: 89.2e9, market_cap_rank: 4, total_volume: 2.1e9, price_change_percentage_24h: -0.84, price_change_percentage_7d: -1.23, circulating_supply: 145.5e6, total_supply: 200e6, ath: 720, ath_change_percentage: -14.9, high_24h: 624, low_24h: 608 },
  { id: "ripple", symbol: "XRP", name: "XRP", current_price: 0.5234, market_cap: 29.1e9, market_cap_rank: 7, total_volume: 1.4e9, price_change_percentage_24h: -2.14, price_change_percentage_7d: -4.02, circulating_supply: 55.6e9, total_supply: 100e9, ath: 3.84, ath_change_percentage: -86.4, high_24h: 0.541, low_24h: 0.518 },
  { id: "cardano", symbol: "ADA", name: "Cardano", current_price: 0.4456, market_cap: 15.8e9, market_cap_rank: 9, total_volume: 420e6, price_change_percentage_24h: 1.23, price_change_percentage_7d: 2.11, circulating_supply: 35.4e9, total_supply: 45e9, ath: 3.09, ath_change_percentage: -85.6, high_24h: 0.452, low_24h: 0.438 },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", current_price: 27.84, market_cap: 11.1e9, market_cap_rank: 12, total_volume: 380e6, price_change_percentage_24h: 3.51, price_change_percentage_7d: 6.72, circulating_supply: 399e6, total_supply: 720e6, ath: 144, ath_change_percentage: -80.7, high_24h: 28.4, low_24h: 26.9 },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", current_price: 14.23, market_cap: 8.4e9, market_cap_rank: 14, total_volume: 410e6, price_change_percentage_24h: 2.94, price_change_percentage_7d: 4.88, circulating_supply: 591e6, total_supply: 1e9, ath: 52.7, ath_change_percentage: -73.0, high_24h: 14.5, low_24h: 13.8 },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", current_price: 6.78, market_cap: 9.2e9, market_cap_rank: 13, total_volume: 220e6, price_change_percentage_24h: -1.12, price_change_percentage_7d: 1.54, circulating_supply: 1.36e9, total_supply: null, ath: 54.98, ath_change_percentage: -87.7, high_24h: 6.92, low_24h: 6.7 },
  { id: "matic-network", symbol: "MATIC", name: "Polygon", current_price: 0.521, market_cap: 5.1e9, market_cap_rank: 18, total_volume: 290e6, price_change_percentage_24h: -0.42, price_change_percentage_7d: -2.31, circulating_supply: 9.8e9, total_supply: 10e9, ath: 2.92, ath_change_percentage: -82.2, high_24h: 0.531, low_24h: 0.517 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", current_price: 0.1289, market_cap: 18.6e9, market_cap_rank: 8, total_volume: 1.8e9, price_change_percentage_24h: 5.23, price_change_percentage_7d: 9.14, circulating_supply: 144e9, total_supply: null, ath: 0.731, ath_change_percentage: -82.4, high_24h: 0.134, low_24h: 0.122 },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", current_price: 0.00001723, market_cap: 10.1e9, market_cap_rank: 11, total_volume: 410e6, price_change_percentage_24h: 1.81, price_change_percentage_7d: 3.42, circulating_supply: 589e12, total_supply: null, ath: 0.0000882, ath_change_percentage: -80.5, high_24h: 0.0000176, low_24h: 0.0000169 },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", current_price: 71.42, market_cap: 5.3e9, market_cap_rank: 17, total_volume: 340e6, price_change_percentage_24h: 0.82, price_change_percentage_7d: 1.12, circulating_supply: 74.6e6, total_supply: 84e6, ath: 410, ath_change_percentage: -82.6, high_24h: 72.4, low_24h: 70.8 },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", current_price: 7.84, market_cap: 4.7e9, market_cap_rank: 21, total_volume: 110e6, price_change_percentage_24h: -0.94, price_change_percentage_7d: 2.31, circulating_supply: 599e6, total_supply: 1e9, ath: 44.97, ath_change_percentage: -82.6, high_24h: 8.02, low_24h: 7.71 },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", current_price: 6.42, market_cap: 2.5e9, market_cap_rank: 28, total_volume: 90e6, price_change_percentage_24h: 1.42, price_change_percentage_7d: -1.23, circulating_supply: 391e6, total_supply: null, ath: 44.7, ath_change_percentage: -85.7, high_24h: 6.52, low_24h: 6.31 },
  { id: "aptos", symbol: "APT", name: "Aptos", current_price: 8.14, market_cap: 3.4e9, market_cap_rank: 24, total_volume: 120e6, price_change_percentage_24h: 3.21, price_change_percentage_7d: 7.42, circulating_supply: 418e6, total_supply: null, ath: 19.9, ath_change_percentage: -59.1, high_24h: 8.31, low_24h: 7.88 },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", current_price: 5.23, market_cap: 5.6e9, market_cap_rank: 16, total_volume: 210e6, price_change_percentage_24h: 4.01, price_change_percentage_7d: 8.12, circulating_supply: 1.07e9, total_supply: null, ath: 20.4, ath_change_percentage: -74.4, high_24h: 5.34, low_24h: 5.01 },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", current_price: 0.842, market_cap: 2.8e9, market_cap_rank: 26, total_volume: 180e6, price_change_percentage_24h: -1.81, price_change_percentage_7d: -3.41, circulating_supply: 3.33e9, total_supply: 10e9, ath: 2.42, ath_change_percentage: -65.2, high_24h: 0.864, low_24h: 0.831 },
  { id: "optimism", symbol: "OP", name: "Optimism", current_price: 1.74, market_cap: 1.9e9, market_cap_rank: 34, total_volume: 140e6, price_change_percentage_24h: 2.11, price_change_percentage_7d: 4.23, circulating_supply: 1.09e9, total_supply: 4.29e9, ath: 4.85, ath_change_percentage: -64.1, high_24h: 1.78, low_24h: 1.7 },
  { id: "injective-protocol", symbol: "INJ", name: "Injective", current_price: 22.41, market_cap: 2.1e9, market_cap_rank: 31, total_volume: 95e6, price_change_percentage_24h: 6.32, price_change_percentage_7d: 12.41, circulating_supply: 93.4e6, total_supply: 100e6, ath: 52.6, ath_change_percentage: -57.4, high_24h: 22.9, low_24h: 21.1 },
];

const BASE_IMG = "https://assets.coingecko.com/coins/images";

const COIN_IMAGES: Record<string, string> = {
  bitcoin: `${BASE_IMG}/1/large/bitcoin.png`,
  ethereum: `${BASE_IMG}/279/large/ethereum.png`,
  solana: `${BASE_IMG}/4128/large/solana.png`,
  binancecoin: `${BASE_IMG}/825/large/binance-coin-logo.png`,
  ripple: "https://cryptologos.cc/logos/xrp-xrp-logo.png",
  cardano: `${BASE_IMG}/1050/large/cardano.png`,
  "avalanche-2": `${BASE_IMG}/12559/large/Avalanche_Circle_RedWhite_Trans.png`,
  chainlink: `${BASE_IMG}/877/large/chainlink-new-logo.png`,
  polkadot: `${BASE_IMG}/12171/large/polkadot.png`,
  "matic-network": `${BASE_IMG}/4713/large/matic-token-icon.png`,
  dogecoin: `${BASE_IMG}/6569/large/dogecoin.png`,
  "shiba-inu": `${BASE_IMG}/11939/large/shiba.png`,
  litecoin: `${BASE_IMG}/2/large/litecoin.png`,
  uniswap: `${BASE_IMG}/12504/large/uni.jpg`,
  cosmos: `${BASE_IMG}/1481/large/cosmos_hub.png`,
  aptos: `${BASE_IMG}/26455/large/aptos_round.png`,
  near: `${BASE_IMG}/10365/large/near.jpg`,
  arbitrum: `${BASE_IMG}/16547/large/photo_2023-03-29_21.47.00.jpeg`,
  optimism: `${BASE_IMG}/25244/large/Optimism.png`,
  "injective-protocol": `${BASE_IMG}/12882/large/Secondary_Symbol.png`,
};

export const COINS: Coin[] = COINS_SEED.map((c) => ({
  ...c,
  image: COIN_IMAGES[c.id] || "",
  sparkline_in_7d: { price: sparkline(c.current_price) },
}));

export function findCoin(idOrSymbol: string): Coin | undefined {
  const q = idOrSymbol.toLowerCase();
  return COINS.find(
    (c) => c.id.toLowerCase() === q || c.symbol.toLowerCase() === q
  );
}

// --- News (mirrors aggregated news feed shape) ---
export const NEWS: NewsItem[] = [
  { id: "n1", title: "Bitcoin Breaks $67K as ETF Inflows Hit Record Weekly High", summary: "Spot Bitcoin ETFs absorbed over $2.1B last week, the largest weekly inflow since launch, pushing BTC past resistance at $67,000 amid renewed institutional appetite.", url: "#", source: "CoinDesk", published_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(), sentiment: "positive", tickers: ["BTC"] },
  { id: "n2", title: "Ethereum's Pectra Upgrade Goes Live on Mainnet", summary: "The Pectra hard fork activated successfully, introducing account abstraction features and improved validator economics, with ETH climbing toward the $3,600 level.", url: "#", source: "The Block", published_at: new Date(Date.now() - 52 * 60 * 1000).toISOString(), sentiment: "positive", tickers: ["ETH"] },
  { id: "n3", title: "Solana Network Sees Record DEX Volume as Memecoin Frenzy Continues", summary: "Weekly DEX volume on Solana surpassed $8B, driven by sustained memecoin activity, though network congestion reports have resurfaced during peak periods.", url: "#", source: "Decrypt", published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), sentiment: "neutral", tickers: ["SOL"] },
  { id: "n4", title: "SEC Approves First Spot Ethereum ETFs for Trading", summary: "The U.S. Securities and Exchange Commission gave final approval for spot Ethereum ETFs to begin trading, marking a historic milestone for the second-largest cryptocurrency.", url: "#", source: "Reuters", published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), sentiment: "positive", tickers: ["ETH"] },
  { id: "n5", title: "Ripple Wins Partial Ruling in SEC Case, XRP Rallies", summary: "A federal judge ruled that XRP sales on public exchanges did not constitute securities offerings, sending XRP up 24% on heavy volume.", url: "#", source: "Bloomberg", published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), sentiment: "positive", tickers: ["XRP"] },
  { id: "n6", title: "Crypto Market Liquidations Top $400M as Volatility Spikes", summary: "A sharp move in BTC triggered cascading liquidations across leveraged positions, with longs bearing the brunt of the damage in a 4-hour window.", url: "#", source: "CoinTelegraph", published_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), sentiment: "negative", tickers: ["BTC", "ETH"] },
  { id: "n7", title: "Chainlink Launches CCIP for Cross-Chain Institutional Settlement", summary: "The new protocol enables banks to settle tokenized assets across blockchains, with Swift and major financial institutions joining the pilot program.", url: "#", source: "The Defiant", published_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(), sentiment: "positive", tickers: ["LINK"] },
  { id: "n8", title: "Dogecoin Eyes $0.13 Breakout as Social Volume Surges", summary: "Social media mentions for DOGE rose 340% week-over-week, with traders watching a key resistance level that could trigger a larger move if broken.", url: "#", source: "CryptoSlate", published_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), sentiment: "neutral", tickers: ["DOGE"] },
];

// --- Trending coins (mirrors CoinGecko /search/trending) ---
export const TRENDING: TrendingCoin[] = [
  { id: "injective-protocol", name: "Injective", symbol: "INJ", market_cap_rank: 31, thumb: COIN_IMAGES["injective-protocol"], price_btc: 0.0000332, score: 0 },
  { id: "solana", name: "Solana", symbol: "SOL", market_cap_rank: 5, thumb: COIN_IMAGES.solana, price_btc: 0.00249, score: 1 },
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", market_cap_rank: 1, thumb: COIN_IMAGES.bitcoin, price_btc: 1, score: 2 },
  { id: "near", name: "NEAR Protocol", symbol: "NEAR", market_cap_rank: 16, thumb: COIN_IMAGES.near, price_btc: 0.0000776, score: 3 },
  { id: "aptos", name: "Aptos", symbol: "APT", market_cap_rank: 24, thumb: COIN_IMAGES.aptos, price_btc: 0.00012, score: 4 },
];

// --- Fear & Greed (mirrors CMC /v3/fear-and-greed/historical) ---
export const FEAR_GREED: MarketSentiment = {
  value: 72,
  classification: "Greed",
  yesterday: 68,
  last_week: 65,
  last_month: 71,
  history: Array.from({ length: 7 }, (_, i) => {
    const vals = [58, 62, 61, 67, 64, 68, 72];
    const classifications = ["Greed", "Greed", "Greed", "Greed", "Greed", "Greed", "Greed"];
    return {
      timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
      value: vals[i],
      classification: classifications[i],
    };
  }),
};

// --- AI insight card (mirrors /summary/ endpoint output) ---
export const AI_INSIGHTS: AIInsightCard[] = [
  {
    ticker: "BTC",
    title: "Bitcoin Momentum Strengthens",
    summary:
      "Bitcoin continues to trade above key moving averages with ETF inflows hitting record weekly levels. The breakthrough past $67K confirms bullish momentum, while sustained institutional demand and improving macro conditions support further upside. Watch for resistance near the $68,100–$69,000 zone; a clean break could catalyze a move toward all-time highs.",
    prediction: "bullish",
    confidence: 78,
  },
  {
    ticker: "ETH",
    title: "Ethereum Structural Tailwinds",
    summary:
      "The successful Pectra upgrade and spot ETF approval mark structural milestones for ETH. Staking yields and declining exchange balances suggest accumulation. While ETH/BTC remains range-bound, the fundamental setup favors a gradual grind higher toward $3,700+ if broader risk sentiment cooperates.",
    prediction: "bullish",
    confidence: 71,
  },
  {
    ticker: "SOL",
    title: "Solana Activity at Record Highs",
    summary:
      "DEX volume on Solana reached all-time highs driven by memecoin activity. Network usage is strong, but congestion resurfacing during peak periods is a key risk. Technically oversold on the daily RSI with support forming at $161 — a reclaim of $175 opens path to $190.",
    prediction: "neutral",
    confidence: 58,
  },
  {
    ticker: "XRP",
    title: "XRP Rallies on Legal Clarity",
    summary:
      "The favorable court ruling provided regulatory clarity and triggered a volume spike. While momentum is strong short-term, XRP faces heavy supply between $0.54–$0.56. Sustainability above this range is needed before a larger trend can develop.",
    prediction: "neutral",
    confidence: 52,
  },
];

// --- AI assistant canned responses (mirrors crew /summary/ output, adapted) ---
export const AI_RESPONSES: Record<string, string> = {
  default:
    "Based on current market conditions, I'm seeing a broadly constructive setup across digital assets. Bitcoin is leading with strong ETF-driven inflows, while several Layer 1 and DeFi tokens are showing relative strength. That said, sentiment is at 'Greed' on the Fear & Greed Index, which historically warrants some caution. I'd recommend watching volume trends and key support levels before adding risk. Want me to drill into a specific asset?",
  btc: "Bitcoin (BTC) is currently trading at $67,432, up +2.43% over 24h and +5.21% on the week. Spot Bitcoin ETFs absorbed over $2.1B in record weekly inflows, providing strong institutional demand. Technically, BTC is above its 50- and 200-day moving averages with a bullish RSI of 62. Key levels: resistance at $68,100 and the all-time high of $73,750; support at $65,940 then $64,000. With the Fear & Greed Index at 72 (Greed), momentum favors the upside but watch for short-term pullbacks.",
  eth: "Ethereum (ETH) at $3,521 is benefiting from the recent Pectra upgrade and spot ETF approval. Staking yields remain attractive and exchange balances are declining — signs of accumulation. ETH/BTC is range-bound but fundamentals favor gradual upside. Resistance sits at $3,580 and $3,700; support at $3,440. Confidence in further upside is moderate-high, contingent on broad risk sentiment.",
  ethereum: "Ethereum (ETH) at $3,521 is benefiting from the recent Pectra upgrade and spot ETF approval. Staking yields remain attractive and exchange balances are declining — signs of accumulation. ETH/BTC is range-bound but fundamentals favor gradual upside. Resistance sits at $3,580 and $3,700; support at $3,440. Confidence in further upside is moderate-high, contingent on broad risk sentiment.",
  portfolio:
    "Your portfolio shows a healthy +12.4% overall gain, led by BTC and SOL. With 68% allocation in BTC/ETH, you're concentrated in majors, which is reasonable for risk-adjusted returns. Your small-cap exposure (INJ, NEAR) is adding alpha this week. Consider rebalancing if any single position exceeds 25% and reviewing stop levels given the current 'Greed' sentiment reading.",
  market:
    "The broader crypto market cap is approximately $2.4T, up ~2% over 24h. The Fear & Greed Index sits at 72 (Greed), reflecting elevated but not euphoric sentiment. BTC dominance is holding around 54%, capping altcoin upside. Top gainers today include INJ (+6.3%) and DOGE (+5.2%); BNB and XRP are the notable laggards. Watch for a BTC break of $68K to unlock further altcoin momentum.",
};
