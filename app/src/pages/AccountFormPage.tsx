import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createBankAccount, updateBankAccount, getBankAccountById } from '../services/bankAccountService'
import { ACCOUNT_TYPES } from '../types/bankAccount'
import Input from '../components/ui/Input'
import CurrencyInput from '../components/ui/CurrencyInput'
import TopBar from '../components/layout/TopBar'

const COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#6B7280','#0EA5E9']

export default function AccountFormPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [type, setType] = useState<string>('checking')
  const [color, setColor] = useState(COLORS[0])
  const [initialBalance, setInitialBalance] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit || !user || !id) return
    getBankAccountById(id, user.id).then(acc => {
      if (acc) {
        setName(acc.name)
        setType(acc.type)
        setColor(acc.color)
        setInitialBalance(acc.initial_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
        setIsPrimary(acc.is_primary)
      }
      setLoadingData(false)
    })
  }, [isEdit, user, id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !name.trim()) { setError('Informe o nome da conta'); return }
    setLoading(true); setError('')
    const balance = parseFloat((initialBalance || '0').replace(/\./g, '').replace(',', '.'))
    const payload = { name: name.trim(), type, color, initial_balance: isNaN(balance) ? 0 : balance, is_primary: isPrimary, is_active: true }
    try {
      const ok = isEdit && id
        ? await updateBankAccount(id, user.id, payload)
        : await createBankAccount(user.id, payload)
      if (!ok) throw new Error('Erro ao salvar conta')
      navigate('/app/settings/accounts')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) return (
    <div>
      <TopBar title="Carregando..." backHref="/app/settings/accounts" />
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="app-loading-spinner" />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar title={isEdit ? 'Editar Conta' : 'Nova Conta'} backHref="/app/settings/accounts" />
      <form onSubmit={handleSubmit}>
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100, maxWidth: 480 }}>
          {error && <div className="error-banner">{error}</div>}

          <Input label="Nome da conta" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank, Bradesco..." required />

          <div className="input-wrapper">
            <label className="input-label">Tipo de conta</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ACCOUNT_TYPES.map(at => (
                <button
                  key={at.value}
                  type="button"
                  className={`account-list-item ${type === at.value ? 'active' : ''}`}
                  onClick={() => setType(at.value)}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: at.color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>💳</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{at.label}</span>
                </button>
              ))}
            </div>
          </div>

          <CurrencyInput
            label={isEdit ? 'Saldo inicial' : 'Saldo inicial (atual)'}
            value={initialBalance}
            onChange={setInitialBalance}
          />

          <div className="input-wrapper">
            <label className="input-label">Cor da conta</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--color-text-heading)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          <div className="recurrence-toggle-row">
            <div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Conta principal</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Exibir destaque no dashboard</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

        <div className="form-sticky-footer">
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate('/app/settings/accounts')}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1 }}>
            {loading ? <span className="btn-spinner" /> : isEdit ? 'Salvar' : 'Criar conta'}
          </button>
        </div>
      </form>
    </div>
  )
}
