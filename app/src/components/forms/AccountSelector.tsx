import { useState, useEffect } from 'react'
import { Wallet } from 'lucide-react'
import { BankAccount } from '../../types/bankAccount'
import { getUserBankAccounts } from '../../services/bankAccountService'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'

interface AccountSelectorProps {
  value: string
  onChange: (accountId: string) => void
  label?: string
  error?: string
  excludeId?: string
}

export default function AccountSelector({ value, onChange, label = 'Conta', error, excludeId }: AccountSelectorProps) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserBankAccounts(user.id).then(setAccounts)
  }, [user])

  const filtered = excludeId ? accounts.filter(a => a.id !== excludeId) : accounts
  const selected = accounts.find(a => a.id === value)

  return (
    <>
      <div className="input-wrapper">
        <label className="input-label">{label}</label>
        <button
          type="button"
          className={`category-selector-btn ${error ? 'input-error' : ''}`}
          onClick={() => setOpen(true)}
        >
          <div
            style={{ width: 28, height: 28, borderRadius: '50%', background: (selected?.color || '#94A3B8') + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Wallet size={14} color={selected?.color || '#94A3B8'} />
          </div>
          <span style={{ fontSize: 14, color: selected ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
            {selected?.name || 'Selecionar conta'}
          </span>
        </button>
        {error && <p className="input-error-msg">{error}</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Selecionar ${label.toLowerCase()}`} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(acc => (
            <button
              key={acc.id}
              type="button"
              className={`account-list-item ${value === acc.id ? 'active' : ''}`}
              onClick={() => { onChange(acc.id); setOpen(false) }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: (acc.color || '#94A3B8') + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Wallet size={16} color={acc.color || '#94A3B8'} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{acc.name}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{acc.type}</p>
              </div>
              {acc.is_primary && <span className="badge badge-primary badge-sm">Principal</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24, fontSize: 14 }}>
              Nenhuma conta cadastrada
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
