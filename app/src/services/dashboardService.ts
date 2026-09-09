import { supabase } from '../lib/supabase'
import { getUserBankAccounts } from './bankAccountService'
import { BankAccount } from '../types/bankAccount'
import { Transaction } from '../types/transaction'

export interface DashboardData {
  primaryAccount: BankAccount | null
  accounts: BankAccount[]
  totalBalance: number
  upcomingTransactions: Transaction[]
  recentTransactions: Transaction[]
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
  // getUserBankAccounts computes current_balance from initial_balance + consolidated
  // transactions on every read — no dependency on the DB trigger-maintained column.
  const allAccounts = await getUserBankAccounts(userId)
  const accountList = allAccounts.filter(a => a.is_active)
  const primaryAccount = accountList.find(a => a.is_primary) || null
  const totalBalance = accountList.reduce((s, a) => s + a.current_balance, 0)

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
    { data: recentTxData },
  ] = await Promise.all([
    supabase.from('transactions')
      .select(`*, category:categories(id, name, icon, color), account:bank_accounts!transactions_account_id_fkey(id, name, type)`)
      .eq('user_id', userId).eq('is_consolidated', false)
      .order('transaction_date', { ascending: true }).limit(5),
    incomeQueryBase,
    expenseQueryBase,
    supabase.from('transactions').select('amount').eq('user_id', userId)
      .in('type', ['income', 'expense']).lte('transaction_date', prevEndDate),
    supabase.from('transactions')
      .select(`*, category:categories(id, name, icon, color), account:bank_accounts!transactions_account_id_fkey(id, name)`)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const income = (incomeData ?? []).reduce((s, t: { amount: number }) => s + Math.abs(t.amount), 0)
  const spent = (expenseData ?? []).reduce((s, t: { amount: number }) => s + Math.abs(t.amount), 0)

  const accountsInitialBalance = accountList.reduce((s, acc) => s + (acc.initial_balance ?? 0), 0)
  const historicalNet = (historicalTxData ?? []).reduce((s, tx: { amount: number }) => s + tx.amount, 0)
  const previousMonthBalance = accountsInitialBalance + historicalNet

  const budget = income
  const hasIncome = income > 0
  const percentage = hasIncome ? Math.min((spent / budget) * 100, 999) : 0
  const isOverBudget = spent > budget && hasIncome

  return {
    primaryAccount, accounts: accountList, totalBalance,
    upcomingTransactions: (upcomingTransactions || []) as Transaction[],
    recentTransactions: (recentTxData || []) as Transaction[],
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
