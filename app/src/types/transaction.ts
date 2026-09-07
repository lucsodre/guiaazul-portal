export type TransactionType = 'income' | 'expense' | 'transfer'
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description?: string
  transaction_date: string
  account_id: string
  transfer_to_account_id?: string
  category_id?: string
  is_recurring: boolean
  recurrence_type?: RecurrenceType
  recurrence_interval?: number
  recurrence_id?: string | null
  is_indefinite_recurrence: boolean
  recurrence_end_date?: string
  parent_transaction_id?: string
  is_consolidated: boolean
  created_at: string
  updated_at: string
  category?: {
    id?: string
    name?: string
    icon?: string
    color?: string
  } | null
  account?: {
    id?: string
    name?: string
    type?: string
  } | null
  transfer_account?: {
    id?: string
    name?: string
    type?: string
  } | null
}

export interface TransactionFormData {
  type: TransactionType
  amount: string
  description: string
  date: Date
  account_id: string
  transfer_to_account_id?: string
  category_id?: string
  is_recurring: boolean
  recurrence_type?: RecurrenceType
  recurrence_interval?: number
  is_consolidated?: boolean
  is_indefinite_recurrence: boolean
  recurrence_end_date: Date | null
  installments_total?: number
  installments_start?: number
}
