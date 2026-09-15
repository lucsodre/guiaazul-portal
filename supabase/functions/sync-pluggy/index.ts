import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLUGGY_API = 'https://api.pluggy.ai'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------- tipos Pluggy ----------
interface PluggyTx {
  id: string
  description: string
  descriptionRaw: string | null
  amount: number
  date: string
  type: 'DEBIT' | 'CREDIT'
  status: string
  accountId: string
  category: string | null
}

interface PluggyAccount {
  id: string
  name: string
  type: string
}

// ---------- helpers Pluggy ----------
async function pluggyAuth(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  })
  if (!res.ok) throw new Error(`Pluggy auth (${res.status}): ${await res.text()}`)
  const { apiKey } = await res.json()
  return apiKey as string
}

async function listAccounts(apiKey: string, itemId: string): Promise<PluggyAccount[]> {
  const res = await fetch(`${PLUGGY_API}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  })
  if (!res.ok) throw new Error(`Pluggy accounts (${res.status}): ${await res.text()}`)
  const { results } = await res.json()
  return (results ?? []) as PluggyAccount[]
}

async function fetchTransactions(apiKey: string, accountId: string): Promise<PluggyTx[]> {
  const all: PluggyTx[] = []
  let cursor: string | null = null

  do {
    const url = new URL(`${PLUGGY_API}/v2/transactions`)
    url.searchParams.set('accountId', accountId)
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url.toString(), { headers: { 'X-API-KEY': apiKey } })
    if (!res.ok) throw new Error(`Pluggy v2/transactions (${res.status}): ${await res.text()}`)
    const data = await res.json()
    all.push(...(data.results ?? []))
    cursor = data.cursor ?? null
  } while (cursor)

  return all
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ---------- handler principal ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Autenticação: CRON_SECRET header (cron) ou JWT de usuário (trigger manual)
    const cronSecret = req.headers.get('X-Cron-Secret') ?? ''
    const expectedCronSecret = Deno.env.get('CRON_SECRET') ?? ''
    const isCron = !!(cronSecret && expectedCronSecret && cronSecret === expectedCronSecret)

    let userId: string | null = null
    if (!isCron) {
      const authHeader = req.headers.get('Authorization') ?? ''
      const token = authHeader.replace('Bearer ', '').trim()
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return json({ error: 'Não autorizado' }, 401)
      userId = user.id
    }

    const body = await req.json().catch(() => ({}))
    const action: string = body.action ?? 'sync'

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID')!
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET')!

    // ── action: list_accounts (descobre os IDs das contas Pluggy) ──
    if (action === 'list_accounts') {
      if (!userId) return json({ error: 'list_accounts requer autenticação de usuário' }, 400)

      const { data: profile } = await supabase
        .from('profiles')
        .select('pluggy_enabled, pluggy_item_id')
        .eq('id', userId)
        .single()

      if (!profile?.pluggy_enabled) return json({ error: 'Pluggy não habilitado para este usuário' }, 403)
      if (!profile.pluggy_item_id) return json({ error: 'pluggy_item_id não configurado' }, 400)

      const apiKey = await pluggyAuth(clientId, clientSecret)
      const accounts = await listAccounts(apiKey, profile.pluggy_item_id)
      return json({ accounts })
    }

    // ── action: sync ──
    type ProfileRow = { id: string; pluggy_item_id: string; pluggy_last_sync: string | null; pluggy_sync_from_date: string | null }
    let queue: ProfileRow[] = []

    if (isCron) {
      // Modo cron: sincroniza todos os usuários habilitados
      const { data } = await supabase
        .from('profiles')
        .select('id, pluggy_item_id, pluggy_last_sync, pluggy_sync_from_date')
        .eq('pluggy_enabled', true)
        .not('pluggy_item_id', 'is', null)
      queue = (data ?? []) as ProfileRow[]
    } else {
      // Modo manual: verifica que o usuário tem acesso
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, pluggy_enabled, pluggy_item_id, pluggy_last_sync, pluggy_sync_from_date')
        .eq('id', userId!)
        .single()

      if (!profile?.pluggy_enabled) return json({ error: 'Pluggy não habilitado para este usuário' }, 403)
      if (!profile.pluggy_item_id) return json({ error: 'Configure o Item ID do Itaú primeiro' }, 400)
      if (!profile.pluggy_sync_from_date) return json({ error: 'Configure a data de início da sincronização primeiro' }, 400)
      queue = [profile as ProfileRow]
    }

    const results: { user_id: string; synced: number; skipped: number; error?: string }[] = []

    for (const profile of queue) {
      try {
        const apiKey = await pluggyAuth(clientId, clientSecret)

        const pluggyAccounts = await listAccounts(apiKey, profile.pluggy_item_id)

        // Carrega contas bancárias do usuário para mapeamento Pluggy → nosso sistema
        const { data: bankAccounts } = await supabase
          .from('bank_accounts')
          .select('id, pluggy_account_id, is_primary, is_active')
          .eq('user_id', profile.id)

        const primaryFallback = (bankAccounts ?? []).find(a => a.is_primary && a.is_active)
          ?? (bankAccounts ?? []).find(a => a.is_active)

        let synced = 0
        let skipped = 0

        for (const pluggyAcc of pluggyAccounts) {
          // Tenta mapear; usa conta principal como fallback
          const bankAcc = (bankAccounts ?? []).find(a => a.pluggy_account_id === pluggyAcc.id)
            ?? primaryFallback

          if (!bankAcc) {
            console.warn(`user=${profile.id}: sem conta bancária para account=${pluggyAcc.id}`)
            continue
          }

          const allTxs = await fetchTransactions(apiKey, pluggyAcc.id)

          // Filtra apenas transações a partir da data configurada
          const fromDate = profile.pluggy_sync_from_date // 'YYYY-MM-DD' ou null
          const txs = fromDate
            ? allTxs.filter(tx => tx.date.split('T')[0] >= fromDate)
            : allTxs

          for (const tx of txs) {
            const amount = tx.type === 'DEBIT' ? -Math.abs(tx.amount) : Math.abs(tx.amount)

            const { error } = await supabase.from('transactions').upsert(
              {
                user_id:             profile.id,
                pluggy_external_id:  tx.id,
                description:         tx.description || tx.descriptionRaw || 'Transação importada',
                amount,
                type:                tx.type === 'DEBIT' ? 'expense' : 'income',
                transaction_date:    tx.date.split('T')[0],
                account_id:          bankAcc.id,
                is_consolidated:     true,
                is_recurring:        false,
                category_id:         null,
              },
              {
                onConflict:      'pluggy_external_id',
                ignoreDuplicates: true,
              },
            )

            if (error) {
              console.error(`tx=${tx.id}:`, error.message)
              skipped++
            } else {
              synced++
            }
          }
        }

        await supabase
          .from('profiles')
          .update({ pluggy_last_sync: new Date().toISOString() })
          .eq('id', profile.id)

        results.push({ user_id: profile.id, synced, skipped })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`sync error user=${profile.id}:`, msg)
        results.push({ user_id: profile.id, synced: 0, skipped: 0, error: msg })
      }
    }

    return json({ ok: true, results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ ok: false, error: msg }, 500)
  }
})
