import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createTransaction, updateTransaction, getUserTransactions } from '../services/transactionService'
import { TransactionFormData, TransactionType, RecurrenceType } from '../types/transaction'
import { toInputDate, fromInputDate } from '../utils/date'
import { formatInputBR } from '../utils/currency'
import CurrencyInput from '../components/ui/CurrencyInput'
import CategorySelector from '../components/forms/CategorySelector'
import AccountSelector from '../components/forms/AccountSelector'
import RecurrenceConfig from '../components/forms/RecurrenceConfig'
import TopBar from '../components/layout/TopBar'

const TYPE_LABELS: Record<TransactionType, string> = {
  expense:  'Despesa',
  income:   'Receita',
  transfer: 'Transferência',
}

function emptyForm(): TransactionFormData {
  return {
    type: 'expense',
    amount: '',
    description: '',
    date: new Date(),
    account_id: '',
    transfer_to_account_id: undefined,
    category_id: undefined,
    is_recurring: false,
    recurrence_type: 'monthly',
    is_indefinite_recurrence: false,
    recurrence_end_date: null,
    installments_total: 2,
    installments_start: 1,
    is_consolidated: false,
  }
}

export default function TransactionFormPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<TransactionFormData>(emptyForm())
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({})

  useEffect(() => {
    if (!isEdit || !user || !id) return
    setLoadingData(true)
    getUserTransactions(user.id, {}).then(txs => {
      const tx = txs.find(t => t.id === id)
      if (tx) {
        setForm({
          type: tx.type,
          amount: formatInputBR(Math.abs(tx.amount)),
          description: tx.description || '',
          date: new Date(tx.transaction_date + 'T12:00:00'),
          account_id: tx.account_id,
          transfer_to_account_id: tx.transfer_to_account_id,
          category_id: tx.category_id,
          is_recurring: tx.is_recurring,
          recurrence_type: tx.recurrence_type || 'monthly',
          is_indefinite_recurrence: tx.is_indefinite_recurrence,
          recurrence_end_date: tx.recurrence_end_date ? new Date(tx.recurrence_end_date + 'T12:00:00') : null,
          installments_total: 1,
          installments_start: 1,
          is_consolidated: tx.is_consolidated,
        })
      }
      setLoadingData(false)
    })
  }, [isEdit, user, id])

  function patch(partial: Partial<TransactionFormData>) {
    setForm(prev => ({ ...prev, ...partial }))
    setErrors(prev => {
      const next = { ...prev }
      for (const k of Object.keys(partial)) delete next[k as keyof TransactionFormData]
      return next
    })
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof TransactionFormData, string>> = {}
    if (!form.amount || parseFloat(form.amount.replace(/\./g, '').replace(',', '.')) <= 0) {
      errs.amount = 'Informe o valor'
    }
    if (!form.account_id) errs.account_id = 'Selecione a conta'
    if (form.type === 'transfer' && !form.transfer_to_account_id) {
      errs.transfer_to_account_id = 'Selecione a conta destino'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !user) return
    setLoading(true); setError('')
    try {
      if (isEdit && id) {
        const result = await updateTransaction(id, user.id, form)
        if (!result) throw new Error('Erro ao atualizar transação')
      } else {
        const result = await createTransaction(user.id, form)
        if (!result) throw new Error('Erro ao criar transação')
      }
      navigate('/app/transactions')
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div>
        <TopBar title="Carregando..." backHref="/app/transactions" />
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="app-loading-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar
        title={isEdit ? 'Editar Transação' : 'Nova Transação'}
        backHref="/app/transactions"
      />

      <form onSubmit={handleSubmit}>
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>
          {error && (
            <div className="error-banner">
              <AlertTriangle size={16} /><span>{error}</span>
            </div>
          )}

          {/* Type selector */}
          <div className="type-selector">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
              <button
                key={t}
                type="button"
                className={`type-selector-btn ${form.type === t ? 'active' : ''}`}
                onClick={() => patch({ type: t, category_id: undefined })}
                style={{
                  ...(form.type === t && t === 'income'  ? { background: 'var(--color-income)',    borderColor: 'var(--color-income)' }   : {}),
                  ...(form.type === t && t === 'expense' ? { background: 'var(--color-expense)',   borderColor: 'var(--color-expense)' }  : {}),
                  ...(form.type === t && t === 'transfer'? { background: 'var(--color-transfer)',  borderColor: 'var(--color-transfer)' } : {}),
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Amount */}
          <CurrencyInput
            label="Valor"
            value={form.amount}
            onChange={v => patch({ amount: v })}
            error={errors.amount}
            size="large"
          />

          {/* Description */}
          <div className="input-wrapper">
            <label className="input-label">Descrição</label>
            <div className="input-container">
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Supermercado, Salário..."
                value={form.description}
                onChange={e => patch({ description: e.target.value })}
                maxLength={200}
              />
            </div>
          </div>

          {/* Date */}
          <div className="input-wrapper">
            <label className="input-label">Data</label>
            <div className="input-container">
              <input
                type="date"
                className="input-field"
                value={toInputDate(form.date)}
                onChange={e => patch({ date: fromInputDate(e.target.value) })}
                required
              />
            </div>
          </div>

          {/* Category (not for transfers) */}
          {form.type !== 'transfer' && (
            <CategorySelector
              value={form.category_id || ''}
              onChange={v => patch({ category_id: v })}
              transactionType={form.type}
              description={form.description}
              error={errors.category_id}
            />
          )}

          {/* Account */}
          <AccountSelector
            value={form.account_id}
            onChange={v => patch({ account_id: v })}
            error={errors.account_id}
          />

          {/* Transfer destination */}
          {form.type === 'transfer' && (
            <AccountSelector
              value={form.transfer_to_account_id || ''}
              onChange={v => patch({ transfer_to_account_id: v })}
              label="Conta destino"
              excludeId={form.account_id}
              error={errors.transfer_to_account_id}
            />
          )}

          {/* Consolidated toggle */}
          {!isEdit && (
            <div className="recurrence-toggle-row">
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Consolidado</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Marcar como pago/recebido</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.is_consolidated ?? false}
                  onChange={e => patch({ is_consolidated: e.target.checked })}
                />
                <span className="toggle-track" />
              </label>
            </div>
          )}

          {/* Recurrence (only for create) */}
          {!isEdit && (
            <RecurrenceConfig
              isRecurring={form.is_recurring}
              onToggle={v => patch({ is_recurring: v })}
              isIndefinite={form.is_indefinite_recurrence}
              onToggleIndefinite={v => patch({ is_indefinite_recurrence: v })}
              recurrenceType={form.recurrence_type || 'monthly'}
              onRecurrenceTypeChange={v => patch({ recurrence_type: v })}
              installmentsTotal={form.installments_total || 2}
              onInstallmentsTotalChange={v => patch({ installments_total: v })}
              installmentsStart={form.installments_start || 1}
              onInstallmentsStartChange={v => patch({ installments_start: v })}
              endDate={form.recurrence_end_date}
              onEndDateChange={v => patch({ recurrence_end_date: v })}
            />
          )}
        </div>

        {/* Sticky submit */}
        <div className="form-sticky-footer">
          <button
            type="button"
            className="btn btn-ghost btn-lg"
            onClick={() => navigate('/app/transactions')}
            disabled={loading}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : isEdit ? 'Salvar alterações' : 'Criar transação'}
          </button>
        </div>
      </form>
    </div>
  )
}
