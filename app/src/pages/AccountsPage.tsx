import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getUserBankAccounts, deleteBankAccount } from '../services/bankAccountService'
import { BankAccount } from '../types/bankAccount'
import { formatBRL } from '../utils/currency'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TopBar from '../components/layout/TopBar'

export default function AccountsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<BankAccount | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setAccounts(await getUserBankAccounts(user.id))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function handleDelete(acc: BankAccount) {
    if (!user) return
    setDeleteLoading(true); setDeleteError('')
    const { success, hasTransactions } = await deleteBankAccount(acc.id, user.id)
    setDeleteLoading(false)
    if (!success) {
      setDeleteError(hasTransactions ? 'Esta conta tem transações vinculadas e não pode ser excluída.' : 'Erro ao excluir conta.')
      return
    }
    setConfirmDelete(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar
        title="Contas Bancárias"
        backHref="/app/settings"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/settings/accounts/new')}>
            <Plus size={15} /> Nova conta
          </button>
        }
      />
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 32 }}>Carregando...</p>}

        {deleteError && <div className="error-banner">{deleteError}</div>}

        {!loading && accounts.map(acc => (
          <div key={acc.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: (acc.color || '#94A3B8') + '25',
              border: `2px solid ${acc.color || '#94A3B8'}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 20
            }}>
              💳
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-heading)' }}>
                  {acc.name}
                </p>
                {acc.is_primary && <Star size={12} color="var(--color-warning)" fill="var(--color-warning)" />}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{acc.type}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: acc.current_balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                {formatBRL(acc.current_balance)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <button className="tx-action-btn tx-action-edit" onClick={() => navigate(`/app/settings/accounts/${acc.id}`)} title="Editar">
                <Pencil size={15} />
              </button>
              <button className="tx-action-btn tx-action-delete" onClick={() => { setDeleteError(''); setConfirmDelete(acc) }} title="Excluir">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {!loading && accounts.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>🏦</div>
            <h3>Nenhuma conta</h3>
            <p>Adicione uma conta bancária para começar.</p>
            <button className="btn btn-primary" onClick={() => navigate('/app/settings/accounts/new')}>
              <Plus size={15} /> Adicionar conta
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir conta"
        message={`Tem certeza que deseja excluir "${confirmDelete?.name}"?`}
        confirmLabel="Excluir"
        loading={deleteLoading}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
