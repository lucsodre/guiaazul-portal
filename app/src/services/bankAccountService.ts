import { supabase } from '../lib/supabase'
import { BankAccount } from '../types/bankAccount'

export async function getUserBankAccounts(userId: string): Promise<BankAccount[]> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts').select('*').eq('user_id', userId)
      .order('is_primary', { ascending: false }).order('created_at', { ascending: true })
    if (error) return []
    return data || []
  } catch { return [] }
}

export async function getBankAccountById(accountId: string, userId: string): Promise<BankAccount | null> {
  try {
    const { data, error } = await supabase
      .from('bank_accounts').select('*').eq('id', accountId).eq('user_id', userId).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function createBankAccount(
  userId: string,
  data: { name: string; type: string; color: string; initial_balance: number; is_primary: boolean; is_active: boolean }
): Promise<boolean> {
  try {
    if (data.is_primary) {
      await supabase.from('bank_accounts').update({ is_primary: false })
        .eq('user_id', userId).eq('is_primary', true)
    }
    const { error } = await supabase.from('bank_accounts').insert([{
      user_id: userId, name: data.name, type: data.type, color: data.color,
      initial_balance: data.initial_balance, current_balance: data.initial_balance,
      is_primary: data.is_primary, is_active: data.is_active,
    }])
    return !error
  } catch { return false }
}

export async function updateBankAccount(
  accountId: string, userId: string,
  data: { name: string; type: string; color: string; initial_balance: number; is_primary: boolean; is_active: boolean }
): Promise<boolean> {
  try {
    const currentAccount = await getBankAccountById(accountId, userId)
    if (!currentAccount) return false
    const balanceDiff = data.initial_balance - currentAccount.initial_balance
    const newCurrentBalance = currentAccount.current_balance + balanceDiff

    if (data.is_primary) {
      await supabase.from('bank_accounts').update({ is_primary: false })
        .eq('user_id', userId).eq('is_primary', true).neq('id', accountId)
    }
    const { error } = await supabase.from('bank_accounts').update({
      name: data.name, type: data.type, color: data.color,
      initial_balance: data.initial_balance, current_balance: newCurrentBalance,
      is_primary: data.is_primary, is_active: data.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', accountId).eq('user_id', userId)
    return !error
  } catch { return false }
}

export async function deleteBankAccount(accountId: string, userId: string): Promise<{ success: boolean; hasTransactions: boolean }> {
  try {
    if (!accountId || !userId) return { success: false, hasTransactions: false }
    const { data: transactions } = await supabase
      .from('transactions').select('id').eq('account_id', accountId).limit(1)
    if (transactions && transactions.length > 0) return { success: false, hasTransactions: true }
    const { error } = await supabase.from('bank_accounts').delete().eq('id', accountId).eq('user_id', userId)
    return { success: !error, hasTransactions: false }
  } catch { return { success: false, hasTransactions: false } }
}
