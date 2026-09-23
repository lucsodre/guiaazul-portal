import { supabase } from '../lib/supabase'
import type {
  IncomePlan, IncomePlanFormData,
  CategoryBudget, CategoryBudgetFormData, CategoryBudgetMonth,
  CategoryBudgetProgress, MonthBudgetSummary, UntrackedCategory, UntrackedSummary,
} from '../types/budget'

// ── Date helpers ─────────────────────────────────────────────────────────────

function toYearMonth(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function endOfMonthStr(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prevMonthDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

// ── Income Plans ──────────────────────────────────────────────────────────────

export async function getIncomePlans(userId: string): Promise<IncomePlan[]> {
  const { data } = await supabase
    .from('income_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('day_of_month', { ascending: true })
  return data || []
}

export async function saveIncomePlan(
  userId: string,
  formData: IncomePlanFormData,
  id?: string,
): Promise<IncomePlan | null> {
  const payload = {
    user_id: userId,
    description: formData.description.trim(),
    amount: formData.amount,
    day_of_month: formData.day_of_month,
  }
  if (id) {
    const { data } = await supabase.from('income_plans').update(payload).eq('id', id).select().single()
    return data
  }
  const { data } = await supabase.from('income_plans').insert(payload).select().single()
  return data
}

export async function deleteIncomePlan(id: string): Promise<boolean> {
  const { error } = await supabase.from('income_plans').update({ active: false }).eq('id', id)
  return !error
}

// ── Category Budgets (default template) ──────────────────────────────────────

export async function getCategoryBudgets(userId: string): Promise<CategoryBudget[]> {
  const { data } = await supabase
    .from('category_budgets')
    .select('*, category:categories(*)')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true })
  return data || []
}

export async function saveCategoryBudget(
  userId: string,
  formData: CategoryBudgetFormData,
): Promise<CategoryBudget | null> {
  const { data } = await supabase
    .from('category_budgets')
    .upsert(
      { user_id: userId, category_id: formData.category_id, monthly_amount: formData.monthly_amount, active: true },
      { onConflict: 'user_id,category_id' },
    )
    .select('*, category:categories(*)')
    .single()
  return data
}

export async function updateCategoryBudgetAmount(id: string, monthly_amount: number): Promise<boolean> {
  const { error } = await supabase.from('category_budgets').update({ monthly_amount }).eq('id', id)
  return !error
}

export async function deleteCategoryBudget(id: string): Promise<boolean> {
  const { error } = await supabase.from('category_budgets').update({ active: false }).eq('id', id)
  return !error
}

// ── Monthly overrides ─────────────────────────────────────────────────────────

export async function updateMonthlyLimit(
  userId: string,
  categoryId: string,
  date: Date,
  base_amount: number,
): Promise<CategoryBudgetMonth | null> {
  const year_month = toYearMonth(date)
  const { data } = await supabase
    .from('category_budget_months')
    .upsert(
      { user_id: userId, category_id: categoryId, year_month, base_amount },
      { onConflict: 'user_id,category_id,year_month' },
    )
    .select()
    .single()
  return data
}

// ── Month budget summary (monitoring screen) ──────────────────────────────────

export async function getMonthBudgetSummary(
  userId: string,
  date: Date,
): Promise<MonthBudgetSummary> {
  const yearMonth  = toYearMonth(date)
  const monthEnd   = endOfMonthStr(date)
  const prevDate   = prevMonthDate(date)
  const prevYM     = toYearMonth(prevDate)
  const prevEnd    = endOfMonthStr(prevDate)

  // Parallel fetches
  const [
    { data: budgets },
    { data: currentOverrides },
    { data: currentTxs },
    { data: prevExpenseTxs },
    { data: incomePlans },
    { data: incomeTxs },
    { data: prevIncomeTxs },
    { data: allCategories },
  ] = await Promise.all([
    supabase
      .from('category_budgets')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('category_budget_months')
      .select('*')
      .eq('user_id', userId)
      .eq('year_month', yearMonth),
    supabase
      .from('transactions')
      .select('category_id, amount, is_consolidated')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('transaction_date', yearMonth)
      .lte('transaction_date', monthEnd),
    supabase
      .from('transactions')
      .select('amount, is_consolidated')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('transaction_date', prevYM)
      .lte('transaction_date', prevEnd),
    supabase
      .from('income_plans')
      .select('amount')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'income')
      .eq('is_consolidated', true)
      .gte('transaction_date', yearMonth)
      .lte('transaction_date', monthEnd),
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'income')
      .eq('is_consolidated', true)
      .gte('transaction_date', prevYM)
      .lte('transaction_date', prevEnd),
    // All categories (system + user's own) to resolve parent hierarchy
    supabase
      .from('categories')
      .select('id, name, parent_id, color, icon')
      .or(`user_id.is.null,user_id.eq.${userId}`),
  ])

  // ── Category hierarchy ────────────────────────────────────────────────────

  type CatInfo = { id: string; name: string; parent_id: string | null; color?: string | null; icon?: string | null }

  const catMap = new Map<string, CatInfo>()
  for (const c of (allCategories || [])) catMap.set(c.id, c as CatInfo)

  // Returns the root (parent_id IS NULL) category for any given category id.
  // Supports one level of nesting (subcategory → parent). If the parent itself
  // has a parent, keeps walking up (max depth guard = 5).
  function rootOf(categoryId: string, depth = 0): CatInfo {
    const cat = catMap.get(categoryId)
    if (!cat) return { id: categoryId, name: 'Desconhecida', parent_id: null }
    if (!cat.parent_id || depth >= 5) return cat
    return rootOf(cat.parent_id, depth + 1)
  }

  // ── Income carryover ──────────────────────────────────────────────────────

  const prevIncomeReceived  = (prevIncomeTxs  || []).reduce((s, t) => s + Math.abs(t.amount), 0)
  const prevExpConsolidated = (prevExpenseTxs || [])
    .filter((t) => t.is_consolidated)
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const income_carryover = prevIncomeReceived - prevExpConsolidated

  // ── Roll up budgets → root parent level ───────────────────────────────────

  // parentLimitMap  : rootId → aggregate limit
  // parentCatMap    : rootId → CatInfo (for display)
  const parentLimitMap = new Map<string, number>()
  const parentCatMap   = new Map<string, CatInfo>()

  for (const budget of (budgets || [])) {
    const catId   = budget.category_id as string
    const root    = rootOf(catId)
    const rootId  = root.id

    const override = (currentOverrides || []).find((o) => o.category_id === catId)
    const limit    = override ? override.base_amount : budget.monthly_amount

    parentLimitMap.set(rootId, (parentLimitMap.get(rootId) ?? 0) + limit)
    if (!parentCatMap.has(rootId)) parentCatMap.set(rootId, root)
  }

  // ── Roll up transactions → root parent level ──────────────────────────────

  type Spend = { consolidated: number; pending: number }
  const spendByParent = new Map<string, Spend>()

  for (const tx of (currentTxs || []) as Array<{ category_id: string | null; amount: number; is_consolidated: boolean }>) {
    const root   = tx.category_id ? rootOf(tx.category_id) : null
    const rootId = root?.id ?? '__none__'

    if (!spendByParent.has(rootId)) spendByParent.set(rootId, { consolidated: 0, pending: 0 })
    const s = spendByParent.get(rootId)!
    if (tx.is_consolidated) s.consolidated += Math.abs(tx.amount)
    else                    s.pending      += Math.abs(tx.amount)
  }

  // ── Build CategoryBudgetProgress array ───────────────────────────────────

  const budgetedRootIds = new Set(parentLimitMap.keys())

  const categories: CategoryBudgetProgress[] = []
  for (const [rootId, catInfo] of parentCatMap) {
    const base_amount     = parentLimitMap.get(rootId) ?? 0
    const effective_amount = base_amount
    const spend           = spendByParent.get(rootId) ?? { consolidated: 0, pending: 0 }
    const { consolidated, pending } = spend
    const total_spent  = consolidated + pending
    const remaining    = base_amount - total_spent
    const percentage   = base_amount > 0 ? total_spent / base_amount : (total_spent > 0 ? 1 : 0)

    categories.push({
      category:        catInfo as any,
      base_amount,
      effective_amount,
      consolidated,
      pending,
      total_spent,
      remaining,
      percentage,
      status: percentage > 1 ? 'over' : percentage >= 0.85 ? 'warning' : 'ok',
    })
  }

  // ── Untracked: root parent NOT in any configured budget ───────────────────

  const untrackedMap: Record<string, UntrackedCategory> = {}

  for (const tx of (currentTxs || []) as Array<{ category_id: string | null; amount: number; is_consolidated: boolean }>) {
    const root   = tx.category_id ? rootOf(tx.category_id) : null
    const rootId = root?.id ?? '__none__'

    if (budgetedRootIds.has(rootId)) continue  // accounted for in a budget block

    const key = rootId
    if (!untrackedMap[key]) {
      untrackedMap[key] = {
        id:    root?.id    ?? null,
        name:  root?.name  ?? 'Sem categoria',
        color: root?.color ?? undefined,
        icon:  root?.icon  ?? undefined,
        consolidated: 0,
        pending:      0,
      }
    }
    if (tx.is_consolidated) untrackedMap[key].consolidated += Math.abs(tx.amount)
    else                    untrackedMap[key].pending      += Math.abs(tx.amount)
  }

  const untrackedCategories = Object.values(untrackedMap).sort(
    (a, b) => (b.consolidated + b.pending) - (a.consolidated + a.pending),
  )
  const untracked: UntrackedSummary = {
    consolidated: untrackedCategories.reduce((s, c) => s + c.consolidated, 0),
    pending:      untrackedCategories.reduce((s, c) => s + c.pending,      0),
    categories:   untrackedCategories,
  }

  const total_income_planned  = (incomePlans || []).reduce((s, p) => s + p.amount, 0)
  const total_income_received = (incomeTxs  || []).reduce((s, t) => s + Math.abs(t.amount), 0)
  const total_budgeted        = categories.reduce((s, c) => s + c.base_amount, 0)
  const total_consolidated    = categories.reduce((s, c) => s + c.consolidated, 0) + untracked.consolidated
  const total_pending         = categories.reduce((s, c) => s + c.pending, 0)      + untracked.pending

  return {
    year_month: yearMonth,
    total_income_planned,
    total_income_received,
    income_carryover,
    total_budgeted,
    total_consolidated,
    total_pending,
    categories,
    untracked,
  }
}

// ── Auto-suggest: média dos últimos 3 meses ───────────────────────────────────

export async function suggestBudgetAmount(userId: string, categoryId: string, date: Date): Promise<number> {
  const startDate = toYearMonth(new Date(date.getFullYear(), date.getMonth() - 3, 1))
  const endDate   = toYearMonth(date)  // exclui o mês atual

  const { data } = await supabase
    .from('transactions')
    .select('amount, transaction_date')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('type', 'expense')
    .eq('is_consolidated', true)
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)

  if (!data || data.length === 0) return 0

  // Soma por mês → média
  const byMonth: Record<string, number> = {}
  for (const tx of data) {
    const month = (tx.transaction_date as string).substring(0, 7)
    byMonth[month] = (byMonth[month] || 0) + Math.abs(tx.amount)
  }
  const totals = Object.values(byMonth)
  if (totals.length === 0) return 0
  return Math.round(totals.reduce((s, v) => s + v, 0) / totals.length)
}
