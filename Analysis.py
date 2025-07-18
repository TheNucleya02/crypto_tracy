from exa_py import Exa
import requests
import pandas as pd
import time
from crewai.tools import tool
from crewai import LLM, Agent, Crew, Process, Task
from datetime import datetime
import yfinance as yf
import matplotlib.pyplot as plt
from dotenv import load_dotenv
import os

load_dotenv()
EXA = os.getenv("EXA_API")
GEMINI = os.getenv("GEMINI_API")
ALPHA = os.getenv("ALPHA_API")
exa = Exa(EXA)

# --- News Tool ---
@tool("search_tool")
def search_tool(symbol: str) -> str:
    """Search for the latest news and provide a summary about a given query using Exa."""
    result = exa.search_and_contents(symbol, summary=True)
    if result.results:
        news_list = []
        for item in result.results:
            news_item = {
                "title": getattr(item, "title", "No Title"),
                "url": getattr(item, "url", "#"),
                "id": getattr(item, "id", "#"),
                "score": getattr(item, "score", "No Score"),
                "published_date": getattr(item, "published_date", "Unknown Date"),
                "author": getattr(item, "author", "Unknown Author"),
                "image": getattr(item, "image", "No Image"),
                "favicon": getattr(item, "favicon", "No Favicon"),
                "summary": getattr(item, "summary", "No Summary"),
            }
            news_list.append(news_item)
        output = [
            f"Title: {news_item['title']}\nURL: {news_item['url']}\nSummary: {news_item['summary']}\n"
            for news_item in news_list[:5]
        ]
        return "\n".join(output)
    else:
        return "No results found."

# --- Price Tool ---
@tool("price_tool")
def price_tool(symbol: str) -> str:
    """
    Get daily closing price for a given cryptocurrency ticker symbol for the previous up to 60 days.
    """
    url = f"https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol={symbol}&market=USD&apikey={ALPHA}"
    r = requests.get(url)
    data = r.json()
    price_data = data.get("Time Series (Digital Currency Daily)")
    if not price_data:
        note = data.get("Note")
        error_msg = data.get("Error Message")
        if note:
            return "API limit reached. Please try again later."
        if error_msg:
            return f"Error: {error_msg}"
        return f"No historical price data found for {symbol}."
    daily_closing_price = {
        date: float(price_info['4. close']) for date, price_info in price_data.items()
        if '4. close' in price_info
    }
    if not daily_closing_price:
        return f"No close price data found for {symbol}."
    df = pd.DataFrame.from_dict(daily_closing_price, orient="index", columns=["price"])
    df.index = pd.to_datetime(df.index)
    df = df.sort_index(ascending=False)
    text_output = [
        f"{date.strftime('%Y-%m-%d')} - {row['price']:.2f}"
        for date, row in df.head(30).iterrows()
    ]
    return "\n".join(text_output)

# --- LLM Model ---
llm = LLM(
    model="gemini/gemini-2.0-flash",
    temperature=0.7,
    api_key=GEMINI,
)

news_analyst = Agent(
    role="Cryptocurrency News Analyst",
    goal=("Get news for a given cryptocurrency. Write 1 paragraph analysis "
          "of the market and make prediction - up, down or neutral."),
    backstory=(
        "You're an expert analyst of trends based on cryptocurrency news. "
        "You have a complete understanding of macroeconomic factors, but you specialize "
        "into analyzing news."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm,
    max_iter=5,
    memory=True,  # type: ignore
    respect_context_window=True,
    inject_date=True,
    tools=[search_tool],
)

price_analyst = Agent(
    role="Cryptocurrency Price Analyst",
    goal=("Get historical prices for a User given cryptocurrency. Write 1 paragraph "
          "analysis of the market and make prediction - up, down or neutral."),
    backstory=(
        "You're an expert analyst of trends based on cryptocurrency historical prices. "
        "You specialize into technical analysis based on historical prices."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm,
    max_iter=5,
    memory=True,  # type: ignore
    inject_date=True,
    respect_context_window=True,
    tools=[price_tool],
)

writer = Agent(
    role="Cryptocurrency Report Writer",
    goal="Write 1 paragraph report of the Specific cryptocurrency market Provided by User.",
    backstory="""You're widely accepted as the best cryptocurrency analyst that
understands the market and have tracked every asset for more than 10 years. Your trends
analysis are always extremely accurate.

You're also master level analyst in the traditional markets and have deep understanding
of human psychology. You understand macro factors and combine those multiple
theories - e.g. cycle theory. You're able to hold multiple opinions when analysing anything.
You understand news and historical prices, but you look at those with a
healthy dose of skepticism. You also consider the source of news articles.

Your most well developed talent is providing clear and concise summarization
that explains very complex market topics in simple to understand terms.

Some of your writing techniques include:
- Creating a bullet list (executive summary) of the most important points
- Distill complex analyses to their most important parts

You writing transforms even dry and most technical texts into a pleasant and interesting read.""",
    llm=llm,
    verbose=True,
    max_iter=5,
    memory=True,
    inject_date=True,
    allow_delegation=False,
)

def final_summary(symbol: str) -> str:
    get_news_analysis = Task(
        description=f"Use the search tool to get news for the {symbol} cryptocurrency. The current date is {datetime.now()}. Compose the results into a helpful report",
        expected_output="Create 1 paragraph report for the cryptocurrency, along with a prediction for the future trend.",
        agent=news_analyst,
    )
    get_price_analysis = Task(
        description=f"Use the price tool to get historical prices of {symbol} cryptocurrency. The current date is {datetime.now()}. Compose the results into a helpful report",
        expected_output="Create 1 paragraph summary for the cryptocurrency, along with a prediction for the future trend.",
        agent=price_analyst,
    )
    write_report = Task(
        description="Use the reports from the news analyst and the price analyst to create a report that summarizes the cryptocurrency.",
        expected_output="1 paragraph report that summarizes the market and predicts the future prices (trend) for the cryptocurrency.",
        agent=writer,
        context=[get_news_analysis, get_price_analysis],
    )
    crew = Crew(
        agents=[news_analyst, price_analyst, writer],
        tasks=[get_news_analysis, get_price_analysis, write_report],
        verbose=False,
        process=Process.sequential,
        share_crew=False,
        max_rpm=15,
        function_calling_llm=llm,
        step_callback=lambda x: time.sleep(1),   # Faster feedback for efficiency
    )
    try:
        results = crew.kickoff()
        return str(results)
    except Exception as e:
        return f"❌ Error generating summary for {symbol}: {e}"

def plot_market_graph(symbol):
    try:
        ticker = symbol.upper() + "-USD" if not symbol.endswith("USD") else symbol
        data = yf.download(ticker, period="7d", interval="1h", auto_adjust=True)
        if data.empty:
            return None, f"❌ No data found for {symbol}"
        plt.figure(figsize=(10, 5))
        plt.plot(data['Close'], label=f"{symbol.upper()} Price", color='skyblue')
        plt.title(f"{symbol.upper()} - Market Price (7d)")
        plt.xlabel("Date")
        plt.ylabel("Price in USD")
        plt.legend()
        plt.grid(True)
        img_path = f"{symbol}_chart.png"
        plt.savefig(img_path)
        plt.close()
        return img_path, None
    except Exception as e:
        return None, f"⚠️ Error generating chart: {e}"
