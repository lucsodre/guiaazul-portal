import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLUGGY_API = 'https://api.pluggy.ai'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------- mapeamento Pluggy → categorias Guia Azul ----------
// Ordem: mais específico primeiro. Primeira correspondência ganha.
const CATEGORY_MAP: Array<{ patterns: string[]; id: string }> = [
  // ── Receitas ──
  { patterns: ['salary', 'payroll', 'pró-labore', 'pro-labore'], id: 'dc122d13-6b2e-4263-b722-1911bb9fb9f8' },        // Salário / Pró-labore
  { patterns: ['13th', 'thirteenth', 'décimo'], id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04' },                         // 13º Salário
  { patterns: ['cashback', 'refund', 'reimburse', 'chargeback', 'estorno', 'reembolso'], id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03' }, // Reembolsos/Estornos
  { patterns: ['non-recurring income', 'extra income', 'sale', 'commission'], id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02' }, // Vendas e Extras
  { patterns: ['income', 'retirement', 'government aid', 'pension income'], id: 'dc122d13-6b2e-4263-b722-1911bb9fb9f8' }, // Salário / Pró-labore (genérico)

  // ── Alimentação ──
  { patterns: ['groceries', 'supermarket', 'hipermercado', 'supermercado'], id: '33333333-3333-3333-3333-333333333301' }, // Supermercado
  { patterns: ['food delivery', 'delivery', 'ifood', 'rappi'], id: '33333333-3333-3333-3333-333333333303' },            // Delivery
  { patterns: ['eating out', 'restaurant', 'restaurante', 'lanchonete'], id: '33333333-3333-3333-3333-333333333302' },  // Restaurantes
  { patterns: ['bakery', 'snack', 'padaria', 'café', 'cafe', 'coffee'], id: '33333333-3333-3333-3333-333333333304' },   // Padaria e Lanches
  { patterns: ['food', 'drink', 'grocerie', 'alimenta'], id: 'e9da869c-e565-472b-8a7a-5184915e35df' },                 // Alimentação (genérico)

  // ── Automóvel ──
  { patterns: ['gas station', 'fuel', 'combustível', 'gasolina', 'etanol'], id: '22222222-2222-2222-2222-222222222201' }, // Combustível
  { patterns: ['parking', 'toll', 'estacionamento', 'pedágio'], id: '22222222-2222-2222-2222-222222222203' },            // Estacionamento e Pedágio
  { patterns: ['automotive maintenance', 'car maintenance', 'manutenção auto', 'mecânico', 'oficina'], id: '22222222-2222-2222-2222-222222222202' }, // Manutenção Automotiva
  { patterns: ['vehicle document', 'ipva', 'dpvat', 'licenciamento veículo'], id: '22222222-2222-2222-2222-222222222204' }, // Documentação
  { patterns: ['traffic fine', 'multa de trânsito'], id: '22222222-2222-2222-2222-222222222205' },                       // Multas de trânsito
  { patterns: ['car insurance', 'vehicle insurance', 'seguro auto', 'seguro veículo'], id: '22222222-2222-2222-2222-222222222206' }, // Seguro Automóvel

  // ── Transporte ──
  { patterns: ['taxi', 'ride', 'uber', 'cabify', '99 '], id: '44444444-4444-4444-4444-444444444401' },                 // Transporte por App / Táxi
  { patterns: ['public transit', 'bus', 'metro', 'subway', 'train', 'ônibus', 'metrô', 'vlt', 'brt'], id: '44444444-4444-4444-4444-444444444402' }, // Transporte Público
  { patterns: ['transport', 'automotive'], id: '4002741d-9602-4786-add5-856aeebe41de' },                               // Transporte (genérico)

  // ── Moradia ──
  { patterns: ['rent', 'mortgage', 'aluguel', 'financiamento imóvel', 'prestação imóvel'], id: '11111111-1111-1111-1111-111111111101' }, // Aluguel / Prestação
  { patterns: ['electricity', 'water bill', 'natural gas', 'utility', 'energia elétrica', 'água', 'gás encanado', 'luz'], id: '11111111-1111-1111-1111-111111111102' }, // Contas Fixas
  { patterns: ['condominium', 'condo', 'condomínio'], id: '11111111-1111-1111-1111-111111111103' },                    // Condomínio
  { patterns: ['home repair', 'repair', 'maintenance home', 'reforma', 'conserto casa'], id: '11111111-1111-1111-1111-111111111104' }, // Manutenção e Reparos
  { patterns: ['furniture', 'houseware', 'decor', 'mobiliário', 'decoração'], id: '11111111-1111-1111-1111-111111111105' }, // Mobiliário e Decoração
  { patterns: ['housekeeper', 'maid', 'doméstica', 'empregada', 'diarista'], id: '11111111-1111-1111-1111-111111111106' }, // Empregada doméstica
  { patterns: ['cable tv', 'tv por assinatura', 'tv a cabo', 'net ', 'claro tv', 'sky '], id: '11111111-1111-1111-1111-111111111107' }, // TV a Cabo
  { patterns: ['housing', 'moradia'], id: '9d18e085-e169-4a2a-b257-88a02055abfa' },                                    // Moradia (genérico)

  // ── Saúde ──
  { patterns: ['health plan', 'health insurance', 'plano de saúde', 'unimed', 'amil', 'bradesco saúde'], id: '55555555-5555-5555-5555-555555555501' }, // Plano de Saúde
  { patterns: ['pharmacy', 'drugstore', 'farmácia', 'drogaria', 'droga'], id: '55555555-5555-5555-5555-555555555502' }, // Farmácia
  { patterns: ['dentist', 'hospital', 'lab', 'clinic', 'optometry', 'médico', 'consulta', 'exame', 'laborató'], id: '55555555-5555-5555-5555-555555555503' }, // Consultas e Exames
  { patterns: ['gym', 'wellness', 'fitness', 'academia', 'pilates', 'yoga'], id: '55555555-5555-5555-5555-555555555504' }, // Academia e Bem-estar
  { patterns: ['health', 'saúde', 'healthcare'], id: 'adf5aa9a-4e64-46da-a822-e98f58850666' },                         // Saúde (genérico)

  // ── Educação ──
  { patterns: ['tuition', 'school fee', 'mensalidade escola', 'mensalidade faculdade'], id: '77777777-7777-7777-7777-777777777701' }, // Mensalidades
  { patterns: ['course', 'training', 'curso', 'treinamento', 'capacitação'], id: '77777777-7777-7777-7777-777777777702' }, // Cursos e Treinamentos
  { patterns: ['book', 'textbook', 'livro', 'material didático', 'livraria'], id: '77777777-7777-7777-7777-777777777703' }, // Livros e Material Didático
  { patterns: ['education', 'school', 'university', 'educação', 'ensino'], id: '85e2bfd2-8556-4fc4-bb89-c1cbb8b846ef' }, // Educação (genérico)

  // ── Lazer e Entretenimento ──
  { patterns: ['video streaming', 'music streaming', 'streaming', 'netflix', 'spotify', 'amazon prime', 'disney', 'hbo'], id: '66666666-6666-6666-6666-666666666601' }, // Streaming e Assinaturas
  { patterns: ['cinema', 'theater', 'theatre', 'show', 'concert', 'ingresso', 'teatro'], id: '66666666-6666-6666-6666-666666666602' }, // Cinema, Teatro e Shows
  { patterns: ['travel', 'airline', 'flight', 'accommodation', 'hotel', 'airbnb', 'mileage', 'viagem', 'passagem', 'hospedagem'], id: '66666666-6666-6666-6666-666666666603' }, // Viagens
  { patterns: ['gaming', 'game', 'hobby', 'jogo', 'steam', 'playstation', 'xbox'], id: '66666666-6666-6666-6666-666666666604' }, // Hobbies e Jogos
  { patterns: ['leisure', 'entertainment', 'digital services', 'lazer', 'entretenimento'], id: 'a4705f3f-2dcc-4e14-8a9e-d5dbad5a30c9' }, // Lazer e Entretenimento (genérico)

  // ── Cuidados Pessoais ──
  { patterns: ['clothing', 'fashion', 'apparel', 'shoe', 'vestuário', 'roupa', 'calçado'], id: '88888888-8888-8888-8888-888888888801' }, // Vestuário
  { patterns: ['hygiene', 'beauty', 'hair', 'barber', 'cosmetic', 'estética', 'higiene', 'salão'], id: '88888888-8888-8888-8888-888888888802' }, // Higiene e Estética
  { patterns: ['donation', 'gift', 'present', 'doação', 'presente'], id: '88888888-8888-8888-8888-888888888803' },    // Presentes e Doações
  { patterns: ['shopping', 'pet', 'personal care'], id: '1a2b3c4d-5e6f-7890-abcd-ef1234567890' },                      // Cuidados Pessoais (genérico)

  // ── Serviços Financeiros ──
  { patterns: ['bank fee', 'account fee', 'credit card fee', 'tarifa bancária', 'anuidade', 'tarifa'], id: '99999999-9999-9999-9999-999999999901' }, // Tarifas Bancárias e Anuidades
  { patterns: ['loan', 'financing', 'interest charge', 'empréstimo', 'financiamento', 'juros'], id: '99999999-9999-9999-9999-999999999902' }, // Empréstimos e Juros
  { patterns: ['insurance', 'seguro'], id: '99999999-9999-9999-9999-999999999903' },                                   // Seguros
  { patterns: ['investment', 'fixed income', 'mutual fund', 'stocks', 'investimento', 'aporte', 'tesouro', 'cdb', 'lci', 'fundo'], id: '99999999-9999-9999-9999-999999999904' }, // Investimentos e Aportes
  { patterns: ['tax', 'imposto', 'iof', 'irrf'], id: '9f8e7d6c-5b4a-3210-9876-543210fedcba' },                        // Serviços Financeiros (imposto)

  // ── Serviços (telecom) ──
  { patterns: ['telecom', 'internet', 'mobile plan', 'phone bill', 'internet banda', 'tim ', 'vivo ', 'claro ', 'oi '], id: '11111111-1111-1111-1111-111111111102' }, // Contas Fixas

  // ── Outros ──
  { patterns: ['legal obligation', 'gambling', 'lottery', 'bet', 'other'], id: '1298c3ea-9bc5-45c5-9f8b-62b2635ee858' }, // Outros
]

function mapPluggyCategory(pluggyCategory: string | null): string | null {
  if (!pluggyCategory) return null
  const lower = pluggyCategory.toLowerCase()
  for (const entry of CATEGORY_MAP) {
    if (entry.patterns.some(p => lower.includes(p))) return entry.id
  }
  return null
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
                category_id:         mapPluggyCategory(tx.category),
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
