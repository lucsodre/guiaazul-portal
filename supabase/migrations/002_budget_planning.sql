-- ================================================================
-- Budget Planning — Migration
-- Execute no SQL Editor do Supabase Dashboard
--
-- Tabelas criadas:
--   1. income_plans          — receitas recorrentes previstas
--   2. category_budgets      — limites padrão por categoria (template mensal)
--   3. category_budget_months — limite efetivo por categoria/mês (com carryover)
-- ================================================================


-- 1. Receitas previstas
-- ================================================================
-- Templates de receitas que o usuário espera receber todo mês.
-- day_of_month = 31 é tratado pela app como "último dia do mês".
CREATE TABLE IF NOT EXISTS income_plans (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  description   TEXT          NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  day_of_month  SMALLINT      NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_plans_user
  ON income_plans(user_id);

ALTER TABLE income_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_plans: owner"
  ON income_plans FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. Limites padrão por categoria
-- ================================================================
-- Um registro por (usuário, categoria) define o limite base que se
-- repete todo mês. Quando não existe registro em category_budget_months
-- para um mês, a app usa monthly_amount daqui com carryover = 0.
CREATE TABLE IF NOT EXISTS category_budgets (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  category_id    UUID          NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(12,2) NOT NULL CHECK (monthly_amount >= 0),
  active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_category_budgets_user
  ON category_budgets(user_id);

ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_budgets: owner"
  ON category_budgets FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. Limite efetivo por categoria/mês
-- ================================================================
-- Criado quando o usuário:
--   (a) abre um mês com carryover pendente de cálculo
--   (b) ajusta manualmente o limite de um mês específico
--
-- Lógica de negócio (calculada na app):
--   effective_amount = base_amount + carryover
--
--   base_amount : limite configurado para o mês
--                 (cópia de category_budgets.monthly_amount ou ajuste manual)
--   carryover   : saldo/déficit do mês anterior
--                 positivo = sobrou  →  amplia o limite
--                 negativo = estourou → reduz o limite
--
-- year_month é sempre armazenado como 1º dia do mês (ex: '2026-09-01')
-- para facilitar comparações e índices.
CREATE TABLE IF NOT EXISTS category_budget_months (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  category_id   UUID          NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  year_month    DATE          NOT NULL
                  CHECK (EXTRACT(DAY FROM year_month) = 1),
  base_amount   NUMERIC(12,2) NOT NULL CHECK (base_amount >= 0),
  carryover     NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- effective_amount = base_amount + carryover (calculado pela app, não persiste)
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_cbm_user_month
  ON category_budget_months(user_id, year_month);

ALTER TABLE category_budget_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_budget_months: owner"
  ON category_budget_months FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: mantém updated_at atual em cada UPDATE
CREATE OR REPLACE FUNCTION budget_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cbm_updated_at
  BEFORE UPDATE ON category_budget_months
  FOR EACH ROW EXECUTE FUNCTION budget_set_updated_at();
