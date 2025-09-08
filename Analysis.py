from exa_py import Exa
import requests
from requests.exceptions import ConnectionError, Timeout, TooManyRedirects
import pandas as pd
from crewai.tools import tool
from crewai import LLM, Agent, Task, Crew, Process
from dotenv import load_dotenv
import os

load_dotenv()
EXA = os.getenv("EXA_API")
GEMINI = os.getenv("GEMINI_API")
ALPHA = os.getenv("ALPHA_API")
CMC = os.getenv("CMC_API")
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
        f"{date} - {row['price']:.2f}"
        for date, row in df.head(30).iterrows()
    ]
    return "\n".join(text_output)

# --- fear and greed index ---
@tool("fear_and_greed")
def fear_and_greed_tool():
    '''a powerful tool that analyzes market sentiment to help you make informed crypto investment decisions'''

    url = 'https://pro-api.coinmarketcap.com/v3/fear-and-greed/historical'
    parameters = {
        'start': '1',
        'limit': '10',
    }
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': 'c0fddc48-b2f0-4d24-85c8-f61fdc333f5e'
    }

    try:
        response = requests.get(url, params=parameters, headers=headers)
        data = response.json()
        index = data.get('data')
        fear_and_greed_list = []
        if index:
            for item in index:
                fear_and_greed = {
                    'value': item.get('value'),
                    'value_classification': item.get('value_classification')
                }
                fear_and_greed_list.append(fear_and_greed)
            output = [
            f"Value: {fear_and_greed['value']}\nValue_classificationL: {fear_and_greed['value_classification']}\n"
            for fear_and_greed in fear_and_greed_list
            ]
            return "\n".join(output)
        else:
            return "No results found."
    except (ConnectionError, Timeout, TooManyRedirects) as e:
        print(e)

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

fear_and_greed_analyst = Agent(
    role="Cryptocurrency Fear and greed analyst",
    goal=("Your goal is to analyzes market sentiment and show Crypto Fear and Greed Index to enhance user decision making."),
    backstory=(
        "You're an expert analyst of trends based on real time market analysis "
        "You specialize into technical analysis based on historical prices."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm,
    max_iter=5,
    memory=True,  # type: ignore
    inject_date=True,
    respect_context_window=True,
    tools=[fear_and_greed_tool],
)

writer = Agent(
    role="Cryptocurrency Report Writer",
    goal=("Write 1 paragraph report of the Specific cryptocurrency market Provided by User."),
    backstory=("""You're widely accepted as the best cryptocurrency analyst that
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

    You writing transforms even dry and most technical texts into a pleasant and interesting read."""),
    llm=llm,
    verbose=True,
    max_iter=5,
    memory=True, # type: ignore
    inject_date=True,
    allow_delegation=False,
)

