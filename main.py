from analysis import (
    Task,
    Crew,
    Process,
    news_analyst,
    price_analyst,
    fear_and_greed_analyst,
    writer,
    llm,
)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.orm import Session
from database import get_db
import crud
from auth import (
   create_access_token, get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from models import User, UserCreate, Ticker
from datetime import datetime
import time

app = FastAPI(title="FastAPI Authentication with Database", version="1.0.0")

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

@app.post("/summary/")
def final_summary(ticker: Ticker) -> str:
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
        description="Use the fear and greed tool to find the index value and classification of fear and greed. The current date is {datetime.now()}. Compose the results into a helpful report ",
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
        function_calling_llm=llm,
        step_callback=lambda x: time.sleep(1),   # Faster feedback for efficiency
    )
    try:
        results = crew.kickoff()
        return str(results)
    except Exception as e:
        return f"❌ Error generating summary for {symbol}: {e}"