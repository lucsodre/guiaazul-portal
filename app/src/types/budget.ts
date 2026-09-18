import { Category } from './category'

export interface IncomePlan {
  id: string
  user_id: string
  description: string
  amount: number
  day_of_month: number  // 1–28 = dia fixo; 31 = último dia do mês
  active: boolean
  created_at: string
}

export interface IncomePlanFormData {
  description: string
  amount: number
  day_of_month: number
}

export interface CategoryBudget {
  id: string
  user_id: string
  category_id: string
  monthly_amount: number
  active: boolean
  created_at: string
  category?: Category
}

export interface CategoryBudgetFormData {
  category_id: string
  monthly_amount: number
}

export interface CategoryBudgetMonth {
  id: string
  user_id: string
  category_id: string
  year_month: string  // '2026-09-01' (sempre 1º dia do mês)
  base_amount: number
  carryover: number
  created_at: string
  updated_at: string
}

export interface CategoryBudgetProgress {
  category: Category
  base_amount: number       // limite configurado para o mês (reseta todo mês)
  effective_amount: number  // = base_amount (sem carryover por categoria)
  consolidated: number      // gasto consolidado
  pending: number           // gasto pendente (não consolidado)
  total_spent: number       // consolidated + pending
  remaining: number         // base_amount - total_spent (pode ser negativo)
  percentage: number        // total_spent / base_amount (pode ser > 1)
  status: 'ok' | 'warning' | 'over'
}

export interface UntrackedCategory {
  id: string | null
  name: string
  color?: string
  icon?: string
  consolidated: number
  pending: number
}

export interface UntrackedSummary {
  consolidated: number
  pending: number
  categories: UntrackedCategory[]
}

export interface MonthBudgetSummary {
  year_month: string
  total_income_planned: number   // soma dos income_plans ativos
  total_income_received: number  // receitas consolidadas no mês
  income_carryover: number       // saldo líquido do mês anterior (receita - gastos consolidados)
  total_budgeted: number         // soma dos limites das categorias
  total_consolidated: number     // soma de gastos consolidados (inclui não orçados)
  total_pending: number          // soma de gastos pendentes (inclui não orçados)
  categories: CategoryBudgetProgress[]
  untracked: UntrackedSummary    // gastos em categorias sem orçamento configurado
}
