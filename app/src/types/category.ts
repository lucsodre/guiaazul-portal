export type CategoryType = 'income' | 'expense' | 'transfer'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon?: string
  color?: string
  parent_id?: string
  user_id?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CategoryFormData {
  name: string
  type: CategoryType
  icon?: string
  color?: string
  parent_id?: string
}
