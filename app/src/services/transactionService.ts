import { supabase } from '../lib/supabase'
import { Transaction, TransactionFormData } from '../types/transaction'

function createUuidV4(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function getMonthlyClampedDate(baseDate: Date, monthOffset: number): Date {
  const originalDay = baseDate.getDate()
  const baseMonth = baseDate.getMonth()
  const baseYear = baseDate.getFullYear()
  const targetMonth = baseMonth + monthOffset
  const targetYear = baseYear + Math.floor(targetMonth / 12)
  const targetMonthNormalized = ((targetMonth % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(targetYear, targetMonthNormalized + 1, 0).getDate()
  const clampedDay = Math.min(originalDay, lastDayOfTargetMonth)
  return normalizeDate(new Date(targetYear, targetMonthNormalized, clampedDay))
}

function getNextRecurrenceDate(
  referenceDate: Date,
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly',
  monthlyAnchorDate: Date
): Date {
  if (recurrenceType === 'daily') {
    const next = new Date(referenceDate)
    next.setDate(next.getDate() + 1)
    return normalizeDate(next)
  }
  if (recurrenceType === 'weekly') {
    const next = new Date(referenceDate)
    next.setDate(next.getDate() + 7)
    return normalizeDate(next)
  }
  if (recurrenceType === 'yearly') {
    const next = new Date(referenceDate)
    next.setFullYear(next.getFullYear() + 1)
    return normalizeDate(next)
  }
  const monthDiff =
    (referenceDate.getFullYear() - monthlyAnchorDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - monthlyAnchorDate.getMonth())
  return getMonthlyClampedDate(monthlyAnchorDate, monthDiff + 1)
}

export async function createTransaction(
  userId: string,
  data: TransactionFormData
): Promise<Transaction | null> {
  try {
    const amount = parseFloat(data.amount.replace(/\./g, '').replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return null

    const total = data.installments_total || 1
    const start = data.installments_start || 1

    if (data.is_recurring && (start < 1 || start > total)) return null

    const recurrenceType = data.recurrence_type || 'monthly'
    const isIndefiniteWithChildren = data.is_recurring && data.is_indefinite_recurrence
    const recurrenceId = data.is_recurring ? createUuidV4() : null
    const amountValue = data.type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
    const recurrenceEndDateIso = data.recurrence_end_date
      ? normalizeDate(data.recurrence_end_date).toISOString().split('T')[0]
      : null

    if (isIndefiniteWithChildren) {
      const startDate = normalizeDate(data.date)
      const generatedDates: Date[] = [startDate]

      if (data.recurrence_end_date) {
        const endDate = normalizeDate(data.recurrence_end_date)
        if (endDate < startDate) return null
        let currentDate = startDate
        let guard = 0
        while (guard < 600) {
          const nextDate = getNextRecurrenceDate(currentDate, recurrenceType, startDate)
          if (nextDate > endDate) break
          generatedDates.push(nextDate)
          currentDate = nextDate
          guard += 1
        }
      } else {
        let currentDate = startDate
        for (let i = 0; i < 12; i++) {
          const nextDate = getNextRecurrenceDate(currentDate, recurrenceType, startDate)
          generatedDates.push(nextDate)
          currentDate = nextDate
        }
      }

      const today = normalizeDate(new Date())
      const motherPayload: Record<string, unknown> = {
        user_id: userId, type: data.type, amount: amountValue,
        description: data.description || null,
        transaction_date: generatedDates[0].toISOString().split('T')[0],
        account_id: data.account_id, category_id: data.category_id || null,
        is_recurring: true, recurrence_type: recurrenceType,
        is_indefinite_recurrence: true, recurrence_end_date: recurrenceEndDateIso,
        is_consolidated: data.is_consolidated ?? generatedDates[0] <= today,
        parent_transaction_id: null, recurrence_id: recurrenceId,
      }
      if (data.type === 'transfer' && data.transfer_to_account_id) {
        motherPayload.transfer_to_account_id = data.transfer_to_account_id
      }

      const { data: mother, error: motherError } = await supabase
        .from('transactions').insert([motherPayload]).select().single()
      if (motherError || !mother) throw motherError

      const childrenPayload = generatedDates.slice(1).map((date) => {
        const payload: Record<string, unknown> = {
          user_id: userId, type: data.type, amount: amountValue,
          description: data.description || null,
          transaction_date: date.toISOString().split('T')[0],
          account_id: data.account_id, category_id: data.category_id || null,
          is_recurring: true, recurrence_type: recurrenceType,
          is_indefinite_recurrence: true, recurrence_end_date: recurrenceEndDateIso,
          is_consolidated: data.is_consolidated ?? date <= today,
          parent_transaction_id: mother.id, recurrence_id: recurrenceId,
        }
        if (data.type === 'transfer' && data.transfer_to_account_id) {
          payload.transfer_to_account_id = data.transfer_to_account_id
        }
        return payload
      })

      if (childrenPayload.length > 0) {
        const { error: childrenError } = await supabase.from('transactions').insert(childrenPayload)
        if (childrenError) throw childrenError
      }
      return mother
    }

    let firstTransaction: Transaction | null = null
    const originalDate = normalizeDate(data.date)

    for (let i = start; i <= total; i++) {
      const monthOffset = i - start
      const currentTransactionDate = getMonthlyClampedDate(originalDate, monthOffset)
      const today = normalizeDate(new Date())
      const autoConsolidate = currentTransactionDate <= today

      const transactionData: Record<string, unknown> = {
        user_id: userId, type: data.type, amount: amountValue,
        description: (total > 1 && data.is_recurring)
          ? `${data.description} (${i}/${total})`
          : data.description || null,
        transaction_date: currentTransactionDate.toISOString().split('T')[0],
        account_id: data.account_id, category_id: data.category_id || null,
        is_recurring: data.is_recurring,
        recurrence_type: data.is_recurring ? recurrenceType : null,
        is_indefinite_recurrence: data.is_indefinite_recurrence || false,
        recurrence_end_date: recurrenceEndDateIso,
        is_consolidated: data.is_consolidated ?? autoConsolidate,
        parent_transaction_id: firstTransaction?.id || null,
        recurrence_id: recurrenceId,
      }
      if (data.type === 'transfer' && data.transfer_to_account_id) {
        transactionData.transfer_to_account_id = data.transfer_to_account_id
      }

      const { data: created, error } = await supabase
        .from('transactions').insert([transactionData]).select().single()
      if (error) throw error
      if (i === start) firstTransaction = created
    }

    return firstTransaction
  } catch (error) {
    console.error('[createTransaction] Erro:', error)
    return null
  }
}

export async function consolidateTransaction(transactionId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ is_consolidated: true, updated_at: new Date().toISOString() })
      .eq('id', transactionId).eq('user_id', userId)
    return !error
  } catch { return false }
}

export async function unconsolidateTransaction(transactionId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ is_consolidated: false, updated_at: new Date().toISOString() })
      .eq('id', transactionId).eq('user_id', userId)
    return !error
  } catch { return false }
}

export async function getUserTransactions(
  userId: string,
  filters?: {
    startDate?: string
    endDate?: string
    type?: 'income' | 'expense' | 'transfer'
    accountId?: string
    categoryId?: string
    isConsolidated?: boolean
  }
): Promise<Transaction[]> {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color),
        account:bank_accounts!transactions_account_id_fkey(id, name),
        transfer_account:bank_accounts!transactions_transfer_to_account_id_fkey(id, name)
      `)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.startDate) query = query.gte('transaction_date', filters.startDate)
    if (filters?.endDate) query = query.lte('transaction_date', filters.endDate)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.accountId) {
      query = query.or(`account_id.eq.${filters.accountId},transfer_to_account_id.eq.${filters.accountId}`)
    }
    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters?.isConsolidated !== undefined) query = query.eq('is_consolidated', filters.isConsolidated)

    const { data, error } = await query
    if (error) return []
    return data || []
  } catch { return [] }
}

export async function deleteTransaction(transactionId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId)
    return !error
  } catch { return false }
}

export async function deleteTransactionsBatch(transactionIds: string[], userId: string): Promise<boolean> {
  if (!transactionIds.length) return false
  try {
    const { error } = await supabase
      .from('transactions').delete().in('id', transactionIds).eq('user_id', userId)
    return !error
  } catch { return false }
}

export async function updateTransactionsBatch(
  transactionIds: string[],
  userId: string,
  updates: { transaction_date?: string; is_consolidated?: boolean; account_id?: string }
): Promise<boolean> {
  if (!transactionIds.length) return false
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', transactionIds).eq('user_id', userId)
    return !error
  } catch { return false }
}

export async function getTransactionsSummary(
  userId: string,
  startDate: string,
  endDate: string,
  consolidatedOnly = false
): Promise<{ income: number; expense: number; balance: number }> {
  try {
    let query = supabase
      .from('transactions').select('type, amount')
      .eq('user_id', userId).gte('transaction_date', startDate).lte('transaction_date', endDate)
    if (consolidatedOnly) query = query.eq('is_consolidated', true)

    const { data, error } = await query
    if (error) return { income: 0, expense: 0, balance: 0 }

    const rows = (data ?? []) as { type: string; amount: number }[]
    const income = rows.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0)
    const expense = rows.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)
    return { income, expense, balance: income - expense }
  } catch { return { income: 0, expense: 0, balance: 0 } }
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  formData: TransactionFormData
): Promise<Transaction | null> {
  try {
    const amount = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return null
    const finalAmount = formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
    const transactionDate = new Date(formData.date)
    const today = new Date(); today.setHours(0, 0, 0, 0); transactionDate.setHours(0, 0, 0, 0)
    const shouldAutoConsolidate = transactionDate <= today

    const updateData: Record<string, unknown> = {
      type: formData.type, amount: finalAmount,
      description: formData.description || null,
      transaction_date: formData.date.toISOString().split('T')[0],
      account_id: formData.account_id,
      category_id: formData.type !== 'transfer' ? formData.category_id : null,
      transfer_to_account_id: formData.type === 'transfer' ? formData.transfer_to_account_id : null,
      is_recurring: formData.is_recurring,
      is_indefinite_recurrence: formData.is_indefinite_recurrence || false,
      recurrence_end_date: formData.recurrence_end_date
        ? formData.recurrence_end_date.toISOString().split('T')[0] : null,
      is_consolidated: formData.is_consolidated ?? shouldAutoConsolidate,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('transactions').update(updateData)
      .eq('id', transactionId).eq('user_id', userId)
      .select(`*, account:bank_accounts!transactions_account_id_fkey(id, name),
        transfer_account:bank_accounts!transactions_transfer_to_account_id_fkey(id, name),
        category:categories(id, name, icon, color)`)
      .single()

    if (error) return null
    return data
  } catch { return null }
}

export async function getTransactionById(
  transactionId: string,
  userId: string
): Promise<Transaction | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, account:bank_accounts!transactions_account_id_fkey(id, name),
        transfer_account:bank_accounts!transactions_transfer_to_account_id_fkey(id, name),
        category:categories(id, name, icon, color)`)
      .eq('id', transactionId).eq('user_id', userId).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function getUnconsolidatedCount(
  userId: string, startDate?: string, endDate?: string
): Promise<number> {
  try {
    let query = supabase
      .from('transactions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_consolidated', false)
    if (startDate) query = query.gte('transaction_date', startDate)
    if (endDate) query = query.lte('transaction_date', endDate)
    const { count } = await query
    return count || 0
  } catch { return 0 }
}
