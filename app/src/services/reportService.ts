import { supabase } from '../lib/supabase'

export interface CategoryExpenseItem {
  categoryId: string
  name: string
  color: string
  icon: string
  total: number
  percentage: number
  transactions: number
}

export interface MonthlyCategoryExpenseReport {
  totalExpense: number
  categories: CategoryExpenseItem[]
  monthLabel: string
  startDate: string
  endDate: string
}

export type ReportConsolidationFilter = 'all' | 'consolidated'

export interface CategoryComparison {
  categoryId: string
  name: string
  color: string
  icon: string
  current: number
  previous: number
  variationPct: number
  trend: 'up' | 'down' | 'neutral'
  impactRank: number
}

export interface ComparativeReport {
  currentMonthLabel: string
  previousMonthLabel: string
  currentTotal: number
  previousTotal: number
  totalVariationPct: number
  categories: CategoryComparison[]
  insights: string[]
}

export interface ComparativeReportResult {
  report: ComparativeReport | null
  currentRaw: MonthlyCategoryExpenseReport
  previousRaw: MonthlyCategoryExpenseReport
}

function getMonthRange(referenceDate: Date) {
  const startOfMonth = new Date(referenceDate); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
  const endOfMonth = new Date(referenceDate); endOfMonth.setMonth(endOfMonth.getMonth() + 1); endOfMonth.setDate(0)
  return {
    startDate: startOfMonth.toISOString().split('T')[0],
    endDate: endOfMonth.toISOString().split('T')[0],
    monthLabel: startOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)
}

export async function getMonthlyExpensesByCategory(
  userId: string,
  referenceDate: Date = new Date(),
  consolidationFilter: ReportConsolidationFilter = 'all'
): Promise<MonthlyCategoryExpenseReport> {
  const { startDate, endDate, monthLabel } = getMonthRange(referenceDate)
  try {
    let query = supabase.from('transactions')
      .select('amount, category_id, category:categories(name, color, icon)')
      .eq('user_id', userId).eq('type', 'expense')
      .gte('transaction_date', startDate).lte('transaction_date', endDate)
    if (consolidationFilter === 'consolidated') query = query.eq('is_consolidated', true)
    const { data, error } = await query
    if (error) return { totalExpense: 0, categories: [], monthLabel, startDate, endDate }

    type Row = { amount: number; category_id: string | null; category?: { name?: string; color?: string; icon?: string } | null }
    const rows = (data ?? []) as Row[]
    const grouped = new Map<string, Omit<CategoryExpenseItem, 'percentage'>>()

    rows.forEach((row) => {
      const categoryId = row.category_id ?? 'sem-categoria'
      const amount = Math.abs(row.amount || 0)
      const current = grouped.get(categoryId)
      if (current) { current.total += amount; current.transactions += 1; return }
      grouped.set(categoryId, {
        categoryId, name: row.category?.name || 'Sem categoria',
        color: row.category?.color || '#94A3B8', icon: row.category?.icon || 'tag',
        total: amount, transactions: 1,
      })
    })

    const totalExpense = Array.from(grouped.values()).reduce((s, i) => s + i.total, 0)
    const categories = Array.from(grouped.values())
      .map((item) => ({ ...item, percentage: totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)

    return { totalExpense, categories, monthLabel, startDate, endDate }
  } catch { return { totalExpense: 0, categories: [], monthLabel, startDate, endDate } }
}

function generateComparativeInsights(
  categories: CategoryComparison[], currentTotal: number, previousTotal: number
): string[] {
  const insights: string[] = []
  if (previousTotal > 0) {
    const v = Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
    if (v > 0) insights.push(`Seus gastos totais aumentaram ${v}% em relação ao mês anterior.`)
    else if (v < 0) insights.push(`Parabéns! Você reduziu seus gastos em ${Math.abs(v)}% este mês.`)
  }
  const biggestIncrease = categories.filter(c => c.trend === 'up' && c.previous > 0).sort((a, b) => b.variationPct - a.variationPct)[0]
  if (biggestIncrease) insights.push(`Você gastou ${biggestIncrease.variationPct}% a mais em ${biggestIncrease.name} (${formatMoney(biggestIncrease.current)}).`)
  const biggestCategory = [...categories].sort((a, b) => b.current - a.current)[0]
  if (biggestCategory?.current > 0) insights.push(`Seu maior gasto é ${biggestCategory.name} com ${formatMoney(biggestCategory.current)}.`)
  const biggestReduction = categories.filter(c => c.trend === 'down' && c.previous > 0).sort((a, b) => a.variationPct - b.variationPct)[0]
  if (biggestReduction) insights.push(`${biggestReduction.name} reduziu ${Math.abs(biggestReduction.variationPct)}% — economizou ${formatMoney(biggestReduction.previous - biggestReduction.current)}.`)
  return insights.slice(0, 4)
}

export async function getComparativeReport(
  userId: string, referenceDate: Date = new Date(), consolidationFilter: ReportConsolidationFilter = 'all'
): Promise<ComparativeReportResult> {
  const prevDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1)
  const [currentRaw, previousRaw] = await Promise.all([
    getMonthlyExpensesByCategory(userId, referenceDate, consolidationFilter),
    getMonthlyExpensesByCategory(userId, prevDate, consolidationFilter),
  ])
  if (currentRaw.totalExpense === 0 && previousRaw.totalExpense === 0) return { report: null, currentRaw, previousRaw }

  const prevMap = new Map(previousRaw.categories.map(c => [c.categoryId, c]))
  const currMap = new Map(currentRaw.categories.map(c => [c.categoryId, c]))
  const allIds = new Set([...prevMap.keys(), ...currMap.keys()])

  const categories: CategoryComparison[] = []
  allIds.forEach((id) => {
    const curr = currMap.get(id); const prev = prevMap.get(id)
    const current = curr?.total ?? 0; const previous = prev?.total ?? 0
    const meta = curr ?? prev!
    const variationPct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0
    const trend: 'up' | 'down' | 'neutral' = variationPct > 2 ? 'up' : variationPct < -2 ? 'down' : 'neutral'
    categories.push({ categoryId: id, name: meta.name, color: meta.color, icon: meta.icon, current, previous, variationPct, trend, impactRank: 0 })
  })

  categories.sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous))
  categories.forEach((c, i) => { c.impactRank = i + 1 })

  const currentTotal = currentRaw.totalExpense; const previousTotal = previousRaw.totalExpense
  const totalVariationPct = previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0
  const insights = generateComparativeInsights([...categories], currentTotal, previousTotal)

  return {
    report: { currentMonthLabel: currentRaw.monthLabel, previousMonthLabel: previousRaw.monthLabel, currentTotal, previousTotal, totalVariationPct, categories, insights },
    currentRaw, previousRaw,
  }
}
