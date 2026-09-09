import { supabase } from '../lib/supabase'
import { BankAccount } from '../types/bankAccount'
import { Transaction } from '../types/transaction'

export interface DashboardData {
  primaryAccount: BankAccount | null
  accounts: BankAccount[]
  totalBalance: number
  upcomingTransactions: Transaction[]
  budgetUsage: {
    income: number
    spent: number
    budget: number
    percentage: number
    hasIncome: boolean
    isOverBudget: boolean
    previousMonthBalance: number
  }
}

export type DashboardConsolidationFilter = 'all' | 'consolidated'

export async function getDashboardData(
  userId: string,
  consolidationFilter: DashboardConsolidationFilter = 'all'
): Promise<DashboardData> {
  const { data: accounts, error: accountsError } = await supabase
    .from('bank_accounts').select('*').eq('user_id', userId).eq('is_active', true)
    .order('is_primary', { ascending: false }).order('created_at', { ascending: true })
  if (accountsError) throw accountsError

  const accountList = (accounts ?? []) as BankAccount[]
  const primaryAccount = accountList.find((acc) => acc.is_primary) || null

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startDate = startOfMonth.toISOString().split('T')[0]
  const endDate = endOfMonth.toISOString().split('T')[0]
  const endOfPrevMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), 0)
  const prevEndDate = endOfPrevMonth.toISOString().split('T')[0]

  let incomeQueryBase = supabase.from('transactions').select('amount')
    .eq('user_id', userId).eq('type', 'income').gte('transaction_date', startDate).lte('transaction_date', endDate)
  if (consolidationFilter === 'consolidated') incomeQueryBase = incomeQueryBase.eq('is_consolidated', true)

  let expenseQueryBase = supabase.from('transactions').select('amount')
    .eq('user_id', userId).eq('type', 'expense').gte('transaction_date', startDate).lte('transaction_date', endDate)
  if (consolidationFilter === 'consolidated') expenseQueryBase = expenseQueryBase.eq('is_consolidated', true)

  const [
    { data: upcomingTransactions },
    { data: incomeData },
    { data: expenseData },
    { data: historicalTxData },
    { data: consolidatedTxData },
  ] = await Promise.all([
    supabase.from('transactions')
      .select(`*, category:categories(id, name, icon, color), account:bank_accounts!transactions_account_id_fkey(id, name, type)`)
      .eq('user_id', userId).eq('is_consolidated', false)
      .order('transaction_date', { ascending: true }).limit(5),
    incomeQueryBase,
    expenseQueryBase,
    supabase.from('transactions').select('amount').eq('user_id', userId)
      .in('type', ['income', 'expense']).lte('transaction_date', prevEndDate),
    // Compute totalBalance from consolidated transactions — avoids relying on the
    // current_balance column maintained by a DB trigger that may double-count.
    supabase.from('transactions').select('amount').eq('user_id', userId)
      .eq('is_consolidated', true).in('type', ['income', 'expense']),
  ])

  const income = (incomeData ?? []).reduce((s, t: { amount: number }) => s + Math.abs(t.amount), 0)
  const spent = (expenseData ?? []).reduce((s, t: { amount: number }) => s + Math.abs(t.amount), 0)

  const accountsInitialBalance = accountList.reduce((s, acc) => s + (acc.initial_balance ?? 0), 0)
  const historicalNet = (historicalTxData ?? []).reduce((s, tx: { amount: number }) => s + tx.amount, 0)
  const previousMonthBalance = accountsInitialBalance + historicalNet

  const consolidatedNet = (consolidatedTxData ?? []).reduce((s, tx: { amount: number }) => s + tx.amount, 0)
  const totalBalance = accountsInitialBalance + consolidatedNet

  const budget = income
  const hasIncome = income > 0
  const percentage = hasIncome ? Math.min((spent / budget) * 100, 999) : 0
  const isOverBudget = spent > budget && hasIncome

  return {
    primaryAccount, accounts: accountList, totalBalance,
    upcomingTransactions: (upcomingTransactions || []) as Transaction[],
    budgetUsage: {
      income, spent, budget, percentage: Math.round(percentage),
      hasIncome, isOverBudget, previousMonthBalance,
    },
  }
}

export function isOverdue(transactionDate: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const txDate = new Date(transactionDate + 'T00:00:00')
  return txDate < today
}

export function formatDueDate(transactionDate: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const txDate = new Date(transactionDate + 'T00:00:00')
  const diffDays = Math.ceil((txDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `Atrasado ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
  if (diffDays === 0) return 'Vence hoje'
  if (diffDays === 1) return 'Vence amanhã'
  if (diffDays <= 7) return `Vence em ${diffDays} dias`
  return `Dia ${txDate.getDate()}`
}
