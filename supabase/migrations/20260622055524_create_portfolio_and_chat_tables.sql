/*
# Crypto Assistant: portfolio & chat tables (single-tenant demo)

1. Purpose
This single-tenant schema powers the portfolio/resume demo frontend for a
FastAPI-backed Crypto Assistant. There is no user sign-in (portfolio showcase
front end is public by design), so RLS allows anon + authenticated CRUD.

2. New Tables
- `portfolio_entries`
  - id (uuid, pk)
  - coin_id (text)        CoinGecko-style coin id, e.g. "bitcoin"
  - symbol (text)         e.g. "BTC" (uppercase)
  - name (text)           e.g. "Bitcoin"
  - image (text, nullable) optional coin image URL
  - amount (numeric)      quantity held, > 0
  - buy_price (numeric)   average buy price in USD, > 0
  - created_at (timestamptz) defaults to now()

- `chat_threads`
  - id (uuid, pk)
  - title (text)
  - created_at (timestamptz) defaults to now()
  - updated_at (timestamptz) defaults to now()

- `chat_messages`
  - id (uuid, pk)
  - thread_id (uuid, fk -> chat_threads.id on delete cascade)
  - role (text) one of 'user' | 'assistant'
  - content (text)
  - created_at (timestamptz) defaults to now()

3. Security
- RLS enabled on all three tables.
- CRUD open to anon + authenticated (public shared demo data; no owner scoping).
- Indexes on foreign keys and common lookups.
*/

CREATE TABLE IF NOT EXISTS portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  image text,
  amount numeric(28, 8) NOT NULL CHECK (amount > 0),
  buy_price numeric(28, 8) NOT NULL CHECK (buy_price > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Portfolio entries: open shared CRUD
DROP POLICY IF EXISTS "anon_portfolio_select" ON portfolio_entries;
CREATE POLICY "anon_portfolio_select" ON portfolio_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_portfolio_insert" ON portfolio_entries;
CREATE POLICY "anon_portfolio_insert" ON portfolio_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_portfolio_update" ON portfolio_entries;
CREATE POLICY "anon_portfolio_update" ON portfolio_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_portfolio_delete" ON portfolio_entries;
CREATE POLICY "anon_portfolio_delete" ON portfolio_entries FOR DELETE
  TO anon, authenticated USING (true);

-- Chat threads: open shared CRUD
DROP POLICY IF EXISTS "anon_threads_select" ON chat_threads;
CREATE POLICY "anon_threads_select" ON chat_threads FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_threads_insert" ON chat_threads;
CREATE POLICY "anon_threads_insert" ON chat_threads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_threads_delete" ON chat_threads;
CREATE POLICY "anon_threads_delete" ON chat_threads FOR DELETE
  TO anon, authenticated USING (true);

-- Chat messages: open shared CRUD
DROP POLICY IF EXISTS "anon_messages_select" ON chat_messages;
CREATE POLICY "anon_messages_select" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_messages_insert" ON chat_messages;
CREATE POLICY "anon_messages_insert" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_symbol ON portfolio_entries(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_created ON portfolio_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_threads_updated ON chat_threads(updated_at);

-- Seed a starter portfolio so the demo is not empty
INSERT INTO portfolio_entries (coin_id, symbol, name, image, amount, buy_price)
SELECT 'bitcoin','BTC','Bitcoin','https://assets.coingecko.com/coins/images/1/large/bitcoin.png',0.85,54200
WHERE NOT EXISTS (SELECT 1 FROM portfolio_entries WHERE symbol='BTC');

INSERT INTO portfolio_entries (coin_id, symbol, name, image, amount, buy_price)
SELECT 'ethereum','ETH','Ethereum','https://assets.coingecko.com/coins/images/279/large/ethereum.png',12.5,2980
WHERE NOT EXISTS (SELECT 1 FROM portfolio_entries WHERE symbol='ETH');

INSERT INTO portfolio_entries (coin_id, symbol, name, image, amount, buy_price)
SELECT 'solana','SOL','Solana','https://assets.coingecko.com/coins/images/4128/large/solana.png',145,98.40
WHERE NOT EXISTS (SELECT 1 FROM portfolio_entries WHERE symbol='SOL');

INSERT INTO portfolio_entries (coin_id, symbol, name, image, amount, buy_price)
SELECT 'chainlink','LINK','Chainlink','https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',420,11.20
WHERE NOT EXISTS (SELECT 1 FROM portfolio_entries WHERE symbol='LINK');

INSERT INTO portfolio_entries (coin_id, symbol, name, image, amount, buy_price)
SELECT 'near','NEAR','NEAR Protocol','https://assets.coingecko.com/coins/images/10365/large/near.jpg',540,3.85
WHERE NOT EXISTS (SELECT 1 FROM portfolio_entries WHERE symbol='NEAR');
