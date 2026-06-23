from .auth import (
   create_access_token, get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from .models import User, UserCreate, Ticker,PortfolioEntry
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db, PortfolioEntryDB
from .models import PortfolioListResponse
from sqlalchemy.orm import Session
from datetime import timedelta
from datetime import datetime
from typing import List
from . import crud
import time
import httpx


app = FastAPI(title="FastAPI Authentication with Database", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Crypto Assistant Root"}

@app.post("/register", response_model=User)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = crud.create_user(db=db, user=user)
    return User(
        id=int(new_user.id),
        username=str(new_user.username),
        email=str(new_user.email),
        full_name=str(new_user.full_name),
        disabled=not bool(new_user.is_active),
        roles=[role.name for role in new_user.roles]
    )

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and return access token."""
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Get active user Info - profile
@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_active_user)):
    return {"message": f"Hello {current_user.full_name}, this is a protected route!"}

# Get the summay of Crypto
@app.post("/summary/")
def final_summary(ticker: Ticker, current_user: User = Depends(get_current_active_user)) -> str:
    try:
        from .analysis import (
            Task,
            Crew,
            Process,
            news_analyst,
            price_analyst,
            fear_and_greed_analyst,
            writer,
        )
    except ModuleNotFoundError as exc:
        missing_package = exc.name or "required package"
        raise HTTPException(
            status_code=503,
            detail=(
                f"Summary generation is not available because '{missing_package}' "
                "is not installed. Run 'pip install -r requirements.txt' and make "
                "sure the API keys in your environment are configured."
            ),
        ) from exc

    symbol = ticker.ticker
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
    get_fear_and_greed_index = Task(
        description=f"Use the fear and greed tool to find the index value and classification of fear and greed. The current date is {datetime.now()}. Compose the results into a helpful report ",
        expected_output="Create 1 paragraph summary for the fear and greed index, along with a prediction for the future trend.",
        agent = fear_and_greed_analyst
    )
    write_report = Task(
        description="Use the reports from the news analyst and the price analyst to create a report that summarizes the cryptocurrency.",
        expected_output="1 paragraph report that summarizes the market and predicts the future prices (trend) for the cryptocurrency. Also mention the summary report of fear and greed analysis.",
        agent=writer,
        context=[get_news_analysis, get_price_analysis, get_fear_and_greed_index],
    )
    crew = Crew(
        agents=[news_analyst, price_analyst, fear_and_greed_analyst, writer],
        tasks=[get_news_analysis, get_price_analysis, get_fear_and_greed_index, write_report],
        verbose=False,
        process=Process.sequential,
        share_crew=False,
        max_rpm=15,
        step_callback=lambda x: time.sleep(1),   # Faster feedback for efficiency
    )
    try:
        results = crew.kickoff()
        return str(results)
    except Exception as e:
        return f"❌ Error generating summary for {symbol}: {e}"
    
# Utility: fetch current price from CoinGecko
COINGECKO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "LINK": "chainlink",
    "NEAR": "near",
    "DOGE": "dogecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "BNB": "binancecoin",
    "MATIC": "matic-network",
}

async def get_current_price(symbol: str, coin_id: str | None = None):
    coingecko_id = coin_id or COINGECKO_IDS.get(symbol.upper(), symbol.lower())
    url = f"https://api.coingecko.com/api/v3/simple/price"
    params = {"ids": coingecko_id, "vs_currencies": "usd"}
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
    return data.get(coingecko_id, {}).get("usd", None)


# Add entry
@app.post("/portfolio/add")
def add_entry(entry: PortfolioEntry, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    payload = entry.model_dump()
    payload["user_id"] = current_user.id
    payload["coin_id"] = payload["coin_id"] or COINGECKO_IDS.get(entry.symbol, entry.symbol.lower())
    payload["name"] = payload["name"] or entry.symbol
    db_entry = PortfolioEntryDB(**payload)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return {"message": "✅ Entry added", "data": db_entry}


# Get all entries with current value & P/L
@app.get("/portfolio", response_model=PortfolioListResponse)
async def get_portfolio(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    portfolio = db.query(PortfolioEntryDB).filter(PortfolioEntryDB.user_id == current_user.id).all()
    results = []

    for entry in portfolio:
        current_price = await get_current_price(str(entry.symbol), str(entry.coin_id) if entry.coin_id else None)
        if not current_price:
            current_price = 0

        invested_value = entry.amount * entry.buy_price
        current_value = entry.amount * current_price
        profit_loss = current_value - invested_value

        results.append({
            "id": entry.id,
            "coin_id": entry.coin_id,
            "symbol": entry.symbol,
            "name": entry.name,
            "image": entry.image,
            "amount": entry.amount,
            "buy_price": entry.buy_price,
            "current_price": current_price,
            "invested_value": invested_value,
            "current_value": current_value,
            "profit_loss": profit_loss,
            "created_at": entry.created_at.isoformat() if entry.created_at else None
        })

    return {"portfolio": results}


# Get entry by ID with current price & P/L
@app.get("/portfolio/{entry_id}", )
async def get_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    entry = db.query(PortfolioEntryDB).filter(
        PortfolioEntryDB.id == entry_id,
        PortfolioEntryDB.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    current_price = await get_current_price(str(entry.symbol), str(entry.coin_id) if entry.coin_id else None)
    if not current_price:
        current_price = 0

    invested_value = entry.amount * entry.buy_price
    current_value = entry.amount * current_price
    profit_loss = current_value - invested_value

    return {
        "id": entry.id,
        "coin_id": entry.coin_id,
        "symbol": entry.symbol,
        "name": entry.name,
        "image": entry.image,
        "amount": entry.amount,
        "buy_price": entry.buy_price,
        "current_price": current_price,
        "invested_value": invested_value,
        "current_value": current_value,
        "profit_loss": profit_loss,
        "created_at": entry.created_at.isoformat() if entry.created_at else None
    }


# Delete entry
@app.delete("/portfolio/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    entry = db.query(PortfolioEntryDB).filter(
        PortfolioEntryDB.id == entry_id,
        PortfolioEntryDB.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "🗑️ Entry deleted"}
