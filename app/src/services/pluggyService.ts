import { supabase } from '../lib/supabase'

export interface PluggyProfile {
  pluggy_enabled: boolean
  pluggy_item_id: string | null
  pluggy_last_sync: string | null
  pluggy_sync_from_date: string | null
}

export interface PluggyAccount {
  id: string
  name: string
  type: string
}

export interface SyncResult {
  ok: boolean
  synced?: number
  skipped?: number
  error?: string
}

// Lê configurações Pluggy do perfil do usuário
export async function getPluggyProfile(userId: string): Promise<PluggyProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('pluggy_enabled, pluggy_item_id, pluggy_last_sync, pluggy_sync_from_date')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as PluggyProfile
}

// Salva o Item ID do Itaú no perfil
export async function savePluggyItemId(userId: string, itemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ pluggy_item_id: itemId.trim() })
    .eq('id', userId)
  return !error
}

// Salva a data de início da sincronização (YYYY-MM-DD)
export async function savePluggyFromDate(userId: string, date: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ pluggy_sync_from_date: date || null })
    .eq('id', userId)
  return !error
}

// Lista as contas Pluggy do item (para o usuário descobrir os IDs)
export async function listPluggyAccounts(userId: string): Promise<{ accounts?: PluggyAccount[]; error?: string }> {
  const { data, error } = await supabase.functions.invoke('sync-pluggy', {
    body: { action: 'list_accounts' },
  })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error }
  return { accounts: data.accounts as PluggyAccount[] }
}

// Dispara sincronização manual (usa o JWT do usuário logado)
export async function triggerPluggySync(): Promise<SyncResult> {
  const { data, error } = await supabase.functions.invoke('sync-pluggy', {
    body: { action: 'sync' },
  })
  if (error) return { ok: false, error: error.message }
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Erro desconhecido' }
  const result = data.results?.[0]
  return { ok: true, synced: result?.synced ?? 0, skipped: result?.skipped ?? 0 }
}

// Associa uma conta bancária local ao ID de conta Pluggy
export async function linkBankAccountToPluggy(
  bankAccountId: string,
  pluggyAccountId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('bank_accounts')
    .update({ pluggy_account_id: pluggyAccountId || null })
    .eq('id', bankAccountId)
  return !error
}

// Lê o pluggy_account_id de todas as contas do usuário
export async function getBankAccountsWithPluggyId(userId: string) {
  const { data } = await supabase
    .from('bank_accounts')
    .select('id, name, pluggy_account_id, is_active')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
  return (data ?? []) as { id: string; name: string; pluggy_account_id: string | null; is_active: boolean }[]
}
