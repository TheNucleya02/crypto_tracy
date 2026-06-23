from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, DateTime, Table, ForeignKey, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func

# Database URL - SQLite for development
DATABASE_URL = "sqlite:///./auth.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Association table for many-to-many relationship between users and roles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    roles = relationship("DBRole", secondary=user_roles, back_populates="users")

class DBRole(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)

    users = relationship("DBUser", secondary=user_roles, back_populates="roles")

class PortfolioEntryDB(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    coin_id = Column(String, index=True)
    symbol = Column(String, index=True)
    name = Column(String)
    image = Column(String)
    amount = Column(Float)
    buy_price = Column(Float)
    created_at = Column(DateTime, default=func.now())

    user = relationship("DBUser")

# Create tables
Base.metadata.create_all(bind=engine)

def ensure_portfolio_schema():
    """Add columns introduced after the initial demo database was created."""
    inspector = inspect(engine)
    if "portfolio" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("portfolio")}
    column_defs = {
        "user_id": "INTEGER",
        "coin_id": "VARCHAR",
        "name": "VARCHAR",
        "image": "VARCHAR",
        "created_at": "DATETIME",
    }

    with engine.begin() as connection:
        for column_name, column_type in column_defs.items():
            if column_name not in existing_columns:
                connection.execute(
                    text(f"ALTER TABLE portfolio ADD COLUMN {column_name} {column_type}")
                )

ensure_portfolio_schema()

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
