from .auth import (
   create_access_token, get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .models import User, UserCreate, Ticker, PortfolioEntry
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db, PortfolioEntryDB, ChatThreadDB, ChatMessageDB
from .models import PortfolioListResponse, ChatInput, ChatResponse
from sqlalchemy.orm import Session
from datetime import timedelta
from datetime import datetime
from typing import List
from . import crud
import time
import httpx
import os

from .ai_chat import generate_ai_response


# Local chat thread + message storage (for when Supabase is unavailable)
def _serialize_thread(t):
    return {
        "id": t.id,
        "user_id": t.user_id,
        "title": t.title,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _serialize_message(m):
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }

app = FastAPI(title="Momentum Crypto Suite API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS
# In development the wildcard default is convenient.
# In production set CORS_ORIGINS to a comma-separated list of allowed origins,
# e.g. CORS_ORIGINS=https://myapp.replit.app
# ---------------------------------------------------------------------------
_raw_origins = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS: list[str] = (
    ["*"] if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Auth / User endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"message": "Crypto Assistant Root"}


@app.post("/register", response_model=User)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
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


@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user


@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_active_user)):
    return {"message": f"Hello {current_user.full_name}, this is a protected route!"}


# ---------------------------------------------------------------------------
# AI Summary
# ---------------------------------------------------------------------------

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
        agent=fear_and_greed_analyst
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
        step_callback=lambda x: time.sleep(1),
    )
    try:
        results = crew.kickoff()
        return str(results)
    except Exception as e:
        return f"Error generating summary for {symbol}: {e}"


# ---------------------------------------------------------------------------
# Portfolio
# ---------------------------------------------------------------------------

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
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {"ids": coingecko_id, "vs_currencies": "usd"}
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
    return data.get(coingecko_id, {}).get("usd", None)


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
    return {"message": "Entry added", "data": db_entry}


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


@app.get("/portfolio/{entry_id}")
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
    return {"message": "Entry deleted"}


# ---------------------------------------------------------------------------
# Chat / AI Assistant
# ---------------------------------------------------------------------------

@app.get("/chat/threads")
async def list_threads(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """List all chat threads for the current user."""
    threads = db.query(ChatThreadDB).filter(ChatThreadDB.user_id == current_user.id).order_by(ChatThreadDB.updated_at.desc()).all()
    return [_serialize_thread(t) for t in threads]


@app.post("/chat/threads")
async def create_thread(
    payload: ChatInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new chat thread."""
    title = payload.message[:60] or "New conversation"
    thread = ChatThreadDB(user_id=current_user.id, title=title)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return _serialize_thread(thread)


@app.delete("/chat/threads/{thread_id}")
async def delete_thread(thread_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Delete a chat thread and its messages."""
    thread = db.query(ChatThreadDB).filter(ChatThreadDB.id == thread_id, ChatThreadDB.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    db.delete(thread)
    db.commit()
    return {"message": "Thread deleted"}


@app.post("/chat/threads/{thread_id}/clear")
async def clear_thread(thread_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Clear all messages in a thread."""
    thread = db.query(ChatThreadDB).filter(ChatThreadDB.id == thread_id, ChatThreadDB.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    db.query(ChatMessageDB).filter(ChatMessageDB.thread_id == thread_id).delete()
    thread.title = "New conversation"
    db.commit()
    db.refresh(thread)
    return _serialize_thread(thread)


@app.get("/chat/threads/{thread_id}/messages")
async def list_messages(thread_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """List messages in a thread."""
    thread = db.query(ChatThreadDB).filter(ChatThreadDB.id == thread_id, ChatThreadDB.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    messages = db.query(ChatMessageDB).filter(ChatMessageDB.thread_id == thread_id).order_by(ChatMessageDB.created_at.asc()).all()
    return [_serialize_message(m) for m in messages]


@app.post("/chat/threads/{thread_id}/messages", response_model=ChatResponse)
async def send_message(
    thread_id: int,
    payload: ChatInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Send a message to the AI assistant and get a response."""
    thread = db.query(ChatThreadDB).filter(ChatThreadDB.id == thread_id, ChatThreadDB.user_id == current_user.id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Save user message
    user_msg = ChatMessageDB(thread_id=thread_id, role="user", content=payload.message)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Generate AI response
    response_text = await generate_ai_response(payload.message)

    # Save assistant message
    assistant_msg = ChatMessageDB(thread_id=thread_id, role="assistant", content=response_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    # Update thread timestamp
    thread.updated_at = datetime.now()
    db.commit()

    return {"response": response_text, "thread_id": thread_id, "message_id": assistant_msg.id}


# Public AI chat endpoint — works without authentication
@app.post("/chat/anon", response_model=ChatResponse)
async def chat_anon(payload: ChatInput):
    """Generate an AI response without requiring authentication.
    Thread/message history is not persisted server-side."""
    response_text = await generate_ai_response(payload.message)
    return {"response": response_text, "thread_id": 0, "message_id": 0}


# ---------------------------------------------------------------------------
# Static frontend (production build)
# Mount last so API routes take priority.
# ---------------------------------------------------------------------------

_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(_FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = os.path.join(_FRONTEND_DIST, "index.html")
        return FileResponse(index)
