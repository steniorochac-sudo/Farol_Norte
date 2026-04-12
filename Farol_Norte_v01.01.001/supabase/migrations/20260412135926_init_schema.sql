-- ==========================================
-- 01. Enable UUID Extension
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 02. Create Tables
-- ==========================================

-- Table: accounts
CREATE TABLE accounts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome         TEXT NOT NULL,
  bank         TEXT NOT NULL,
  status       TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, nome)
);

-- Table: credit_cards
CREATE TABLE credit_cards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id  UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  nome        TEXT NOT NULL,
  "limit"     NUMERIC(12,2) NOT NULL,
  closing_day INTEGER,
  due_day     INTEGER,
  status      TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table: categories
CREATE TABLE categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome        TEXT NOT NULL,
  cor         TEXT,
  natureza    TEXT CHECK (natureza IN ('fixa', 'variavel', 'eventual', 'investment', 'investimento')),
  relevancia  TEXT CHECK (relevancia IN ('essencial', 'estilo_vida', 'investimento')),
  tipo        TEXT CHECK (tipo IN ('despesa', 'receita')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, nome)
);

-- Table: categorization_rules
CREATE TABLE categorization_rules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  term        TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, term)
);

-- Table: budgets
CREATE TABLE budgets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id  UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  limit_amount NUMERIC(12,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- Table: transactions
CREATE TABLE transactions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identificador    TEXT NOT NULL, 
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id       UUID REFERENCES accounts(id) ON DELETE CASCADE,
  card_id          UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  data_vencimento  DATE,
  data_pagamento   DATE,
  data             DATE NOT NULL,
  valor            NUMERIC(12,2) NOT NULL,
  nome             TEXT NOT NULL,
  tipo             TEXT CHECK (tipo IN ('receita', 'despesa', 'transferencia', 'despesa_cartao', 'pagamento_cartao')) NOT NULL,
  status           TEXT,
  tipo_lancamento  TEXT,
  parcela_atual    INTEGER,
  parcela_total    INTEGER,
  fatura_links     JSONB,
  split            JSONB,
  conciliado       BOOLEAN DEFAULT false,
  ignorar_no_fluxo BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, identificador)
);


-- ==========================================
-- 03. Enable Row Level Security (RLS)
-- ==========================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 04. Create Policies
-- ==========================================

-- ACCOUNTS
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- CREDIT CARDS
CREATE POLICY "Users can view own credit cards" ON credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit cards" ON credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit cards" ON credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit cards" ON credit_cards FOR DELETE USING (auth.uid() = user_id);

-- CATEGORIES
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- CATEGORIZATION RULES
CREATE POLICY "Users can view own rules" ON categorization_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rules" ON categorization_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON categorization_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON categorization_rules FOR DELETE USING (auth.uid() = user_id);

-- BUDGETS
CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);
