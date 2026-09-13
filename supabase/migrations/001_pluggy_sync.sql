-- =============================================================
-- Pluggy Open Finance: migrations
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- 1. Adiciona campos Pluggy na tabela profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pluggy_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pluggy_item_id   TEXT,
  ADD COLUMN IF NOT EXISTS pluggy_last_sync TIMESTAMPTZ;

-- 2. Adiciona campo de ID externo na tabela transactions (deduplicação)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS pluggy_external_id TEXT;

-- Índice único: evita inserção duplicada caso a constraint unique falhe no upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_pluggy_external_id
  ON transactions (pluggy_external_id)
  WHERE pluggy_external_id IS NOT NULL;

-- 3. Data de corte: apenas transações a partir desta data serão importadas
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pluggy_sync_from_date DATE;

-- 4. Adiciona campo de ID Pluggy na tabela bank_accounts (mapeamento de contas)
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS pluggy_account_id TEXT;

-- =============================================================
-- APÓS rodar as migrations acima, habilite seu usuário:
-- Substitua <SEU-USER-UUID> pelo UUID do seu usuário em
-- Authentication > Users no painel do Supabase.
-- =============================================================
-- UPDATE profiles
--   SET pluggy_enabled = TRUE
-- WHERE id = '<SEU-USER-UUID>';


-- =============================================================
-- OPCIONAL: Agendamento via pg_cron (Supabase Pro / pg_net)
-- Se quiser usar pg_cron em vez do GitHub Actions, execute isto
-- DEPOIS de ter o Edge Function publicado.
-- Substitua <SEU-PROJECT-REF> e <SERVICE-ROLE-KEY>.
-- =============================================================
-- SELECT cron.schedule(
--   'pluggy-daily-sync',
--   '0 6 * * *',   -- 06:00 UTC = 03:00 BRT
--   $$
--   SELECT net.http_post(
--     url     := 'https://<SEU-PROJECT-REF>.supabase.co/functions/v1/sync-pluggy',
--     headers := jsonb_build_object(
--                  'Authorization', 'Bearer <SERVICE-ROLE-KEY>',
--                  'Content-Type',  'application/json'
--                ),
--     body    := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
