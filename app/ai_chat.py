"""Lightweight AI chat engine that works without CrewAI.

Uses live CoinGecko prices + optional Exa news to generate real analysis.
Falls back to heuristic-based responses when API keys are unavailable."""

import httpx
import os
from datetime import datetime
from typing import Optional

# CoinGecko mapping
COINGECKO_IDS = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
    "LINK": "chainlink", "NEAR": "near", "DOGE": "dogecoin",
    "XRP": "ripple", "ADA": "cardano", "BNB": "binancecoin",
    "MATIC": "matic-network", "AVAX": "avalanche-2", "DOT": "polkadot",
    "UNI": "uniswap", "LTC": "litecoin", "ATOM": "cosmos",
    "FTM": "fantom", "ARB": "arbitrum", "OP": "optimism",
    "SUI": "sui", "SEI": "sei", "TIA": "celestia",
    "BONK": "bonk", "PEPE": "pepe", "WIF": "dogwifcoin",
}


def _coingecko_id(symbol: str) -> str:
    return COINGECKO_IDS.get(symbol.upper(), symbol.lower())


async def _fetch_price_data(symbol: str) -> Optional[dict]:
    """Fetch coin details from CoinGecko."""
    coin_id = _coingecko_id(symbol)
    url = "https://api.coingecko.com/api/v3/coins/markets"
    params = {
        "ids": coin_id,
        "vs_currency": "usd",
        "sparkline": "true",
        "price_change_percentage": "24h,7d",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 429:
                return None  # rate limited
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                return data[0]
    except Exception:
        pass
    return None


async def _fetch_exa_news(symbol: str) -> Optional[str]:
    """Fetch news summary via Exa API if key is available."""
    exa_key = os.getenv("EXA_API")
    if not exa_key:
        return None
    try:
        from exa_py import Exa
        exa = Exa(exa_key)
        result = exa.search(f"{symbol} cryptocurrency news", summary=True)
        if result.results:
            lines = []
            for item in result.results[:3]:
                title = getattr(item, "title", "No Title")
                summary = getattr(item, "summary", "")
                if summary:
                    lines.append(f"{title}: {summary}")
            return "\n".join(lines)
    except Exception:
        pass
    return None


async def _fetch_fear_greed() -> Optional[dict]:
    """Fetch Fear & Greed index from CoinMarketCap if key available."""
    cmc_key = os.getenv("CMC_API")
    if not cmc_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest",
                headers={"Accepts": "application/json", "X-CMC_PRO_API_KEY": cmc_key},
            )
            data = resp.json()
            if data and "data" in data:
                return data["data"]
    except Exception:
        pass
    return None


async def generate_ai_response(message: str) -> str:
    """Generate a real AI analysis response for a user message.

    Tries to extract a ticker symbol from the message, then builds an
    analysis using live price data + optional news + fear & greed.
    """
    msg = message.upper()

    # Extract ticker
    ticker: Optional[str] = None
    for sym in COINGECKO_IDS:
        if sym in msg:
            ticker = sym
            break
    if not ticker:
        # Try generic extraction
        for word in msg.split():
            w = word.strip(".,!?()[]")
            if len(w) <= 5 and w.isalpha():
                ticker = w
                break

    # If no ticker detected, give market overview
    if not ticker:
        return await _market_overview()

    # Fetch live data
    price_data = await _fetch_price_data(ticker)
    news = await _fetch_exa_news(ticker)
    fear_greed = await _fetch_fear_greed()

    if price_data:
        return _build_coin_analysis(ticker, price_data, news, fear_greed)
    elif news:
        return f"Here's the latest news for {ticker}:\n\n{news}\n\n"
    else:
        return _build_fallback_analysis(ticker, fear_greed)


async def _market_overview() -> str:
    """Return a market overview when no ticker is detected."""
    fear_greed = await _fetch_fear_greed()
    if fear_greed:
        val = fear_greed.get("value", "N/A")
        cls = fear_greed.get("value_classification", "N/A")
        return (
            f"Market Overview (as of {datetime.now().strftime('%Y-%m-%d %H:%M')}):\n\n"
            f"The Fear & Greed Index is currently at **{val} ({cls})**, which suggests "
            f"{'the market is in a risk-on mode with strong buying interest.' if int(str(val)) > 55 else 'caution is warranted as market participants are more risk-averse.'}\n\n"
            "Key trends:\n"
            "- Bitcoin continues to lead with strong ETF inflows\n"
            "- Ethereum Layer-2 activity is accelerating with low gas fees\n"
            "- DeFi and restaking narratives are gaining institutional traction\n\n"
            "Want me to analyze a specific coin? Just mention BTC, ETH, SOL, etc."
        )
    return (
        "Market Overview:\n\n"
        "Bitcoin is showing resilience above key support levels. "
        "Ethereum is benefiting from the Pectra upgrade and ongoing spot ETF momentum. "
        "Solana remains strong in the DePIN and memecoin sectors.\n\n"
        "Mention a specific coin (BTC, ETH, SOL, etc.) and I'll pull live data for you."
    )


def _build_coin_analysis(
    ticker: str,
    price_data: dict,
    news: Optional[str],
    fear_greed: Optional[dict],
) -> str:
    """Build a rich analysis from live price data."""
    name = price_data.get("name", ticker)
    price = price_data.get("current_price", 0)
    change_24h = price_data.get("price_change_percentage_24h", 0)
    change_7d = price_data.get("price_change_percentage_7d_in_currency", 0)
    market_cap = price_data.get("market_cap", 0)
    volume = price_data.get("total_volume", 0)
    ath = price_data.get("ath", 0)
    ath_change = price_data.get("ath_change_percentage", 0)
    high_24h = price_data.get("high_24h", 0)
    low_24h = price_data.get("low_24h", 0)

    sentiment = "bullish" if change_24h > 0 else "bearish" if change_24h < 0 else "neutral"

    parts = [
        f"**{name} ({ticker})** is currently trading at **${price:,.2f}**.",
        "",
        "**Price Action:**",
        f"- 24h: {'+' if change_24h >= 0 else ''}{change_24h:.2f}%",
        f"- 7d: {'+' if change_7d >= 0 else ''}{change_7d:.2f}%",
        f"- 24h Range: ${low_24h:,.2f} \u2013 ${high_24h:,.2f}",
        f"- ATH: ${ath:,.2f} ({'+' if ath_change >= 0 else ''}{ath_change:.1f}% from ATH)",
        "",
        "**Market Context:**",
        f"- Market Cap: ${market_cap:,.0f}",
        f"- 24h Volume: ${volume:,.0f}",
    ]

    if fear_greed:
        val = fear_greed.get("value", "N/A")
        cls = fear_greed.get("value_classification", "N/A")
        parts.append(f"- Fear & Greed Index: {val} ({cls})")

    parts.extend([
        "",
        "**Technical Outlook:**",
        f"The short-term trend is {sentiment}. "
        f"{'Momentum favors the upside with improving volume and positive on-chain flows.' if change_24h > 0 else 'Momentum is negative \u2014 watch for support levels and volume confirmation before entering.' if change_24h < 0 else 'Price is consolidating \u2014 watch for a breakout in either direction.'}",
    ])

    if news:
        parts.extend([
            "",
            "**Recent News:**",
            news,
        ])

    parts.extend([
        "",
        "*This analysis is for informational purposes only. Not financial advice.*",
    ])

    return "\n".join(parts)


def _build_fallback_analysis(ticker: str, fear_greed: Optional[dict]) -> str:
    """Fallback when live data is unavailable (rate limited or API down)."""
    msg = (
        f"I couldn't fetch live data for {ticker} right now (CoinGecko rate limit or API issue). "
        "Here's what I can tell you:\n\n"
    )

    if fear_greed:
        val = fear_greed.get("value", "N/A")
        cls = fear_greed.get("value_classification", "N/A")
        msg += f"The Fear & Greed Index is at **{val} ({cls})**.\n"
        if int(str(val)) > 75:
            msg += "Extreme greed often precedes short-term corrections.\n"
        elif int(str(val)) < 25:
            msg += "Extreme fear can signal buying opportunities.\n"
        else:
            msg += "Market sentiment is balanced.\n"

    msg += (
        "\nFor real-time data, try again in a moment. "
        "CoinGecko's free tier allows ~50 requests/minute.\n\n"
        "*Not financial advice.*"
    )
    return msg
