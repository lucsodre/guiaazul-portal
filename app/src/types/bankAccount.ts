export interface BankAccount {
  id: string
  user_id: string
  name: string
  type: 'checking' | 'savings' | 'investment' | 'credit' | 'cash'
  color: string
  icon: string
  initial_balance: number
  current_balance: number
  is_active: boolean
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface BankAccountFormData {
  name: string
  type: 'checking' | 'savings' | 'investment' | 'credit' | 'cash'
  color: string
  initial_balance: number
  is_active: boolean
  is_primary: boolean
}

export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente', icon: 'CreditCard', color: '#3B82F6' },
  { value: 'savings', label: 'Poupança', icon: 'Wallet', color: '#10B981' },
  { value: 'investment', label: 'Investimento', icon: 'TrendingUp', color: '#8B5CF6' },
  { value: 'credit', label: 'Cartão de Crédito', icon: 'CreditCard', color: '#F59E0B' },
  { value: 'cash', label: 'Dinheiro', icon: 'Banknote', color: '#6B7280' },
] as const
