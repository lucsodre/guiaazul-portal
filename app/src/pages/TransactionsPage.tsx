import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserTransactions, deleteTransaction, deleteTransactionsBatch,
  updateTransactionsBatch, getTransactionsSummary, consolidateTransaction,
} from '../services/transactionService'
import { Transaction } from '../types/transaction'
import { formatBRL } from '../utils/currency'
import { formatDateHeader, getMonthStart, getMonthEnd } from '../utils/date'
import MonthPicker from '../components/ui/MonthPicker'
import TopBar from '../components/layout/TopBar'
import TransactionCard from '../components/transactions/TransactionCard'
import BulkActionBar from '../components/transactions/BulkActionBar'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { SkeletonList } from '../components/ui/Skeleton'

type FilterStatus = 'all' | 'pending' | 'consolidated'

function groupByDate(txs: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txs) {
    const key = tx.transaction_date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const selectMode = selected.size > 0

  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const startDate = getMonthStart(currentDate)
  const endDate   = getMonthEnd(currentDate)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const isConsolidated = filterStatus === 'consolidated' ? true
                           : filterStatus === 'pending'      ? false
                           : undefined
      const [txs, sum] = await Promise.all([
        getUserTransactions(user.id, { startDate, endDate, isConsolidated }),
        getTransactionsSummary(user.id, startDate, endDate),
      ])
      setTransactions(txs)
      setSummary(sum)
      setSelected(new Set())
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [user, startDate, endDate, filterStatus])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return transactions
    const q = searchQuery.toLowerCase()
    return transactions.filter(tx =>
      tx.description?.toLowerCase().includes(q) ||
      tx.category?.name?.toLowerCase().includes(q) ||
      tx.account?.name?.toLowerCase().includes(q)
    )
  }, [transactions, searchQuery])

  const groups = useMemo(() => groupByDate(filtered), [filtered])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    const allIds = transactions.map(t => t.id)
    if (selected.size === transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function clearSelection() { setSelected(new Set()) }

  const selectedTotal = useMemo(() => {
    return transactions
      .filter(tx => selected.has(tx.id))
      .reduce((sum, tx) => sum + tx.amount, 0)
  }, [transactions, selected])

  async function handleConsolidate(tx: Transaction) {
    if (!user) return
    await consolidateTransaction(tx.id, user.id)
    await load()
  }

  async function handleBulkConsolidate() {
    if (!user || !selected.size) return
    await updateTransactionsBatch(Array.from(selected), user.id, { is_consolidated: true })
    await load()
  }

  function askDelete(ids: string[], label: string) {
    setConfirmDelete({ ids, label })
  }

  async function handleConfirmDelete() {
    if (!user || !confirmDelete) return
    setConfirmLoading(true)
    try {
      if (confirmDelete.ids.length === 1) {
        await deleteTransaction(confirmDelete.ids[0])
      } else {
        await deleteTransactionsBatch(confirmDelete.ids, user.id)
      }
      await load()
    } finally {
      setConfirmLoading(false)
      setConfirmDelete(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar
        title="Transações"
        actions={
          <button
            className="topbar-back"
            onClick={() => setSearchOpen(v => !v)}
            aria-label="Buscar"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
        }
      />

      {/* Month picker */}
      <MonthPicker currentDate={currentDate} onChange={setCurrentDate} maxDate={new Date()} />

      {/* Search bar */}
      {searchOpen && (
        <div style={{ padding: '8px 16px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <input
            type="text"
            placeholder="Buscar transações..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
            className="input-field"
            style={{ width: '100%', background: 'var(--color-bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--color-border)' }}
          />
        </div>
      )}

      {/* Summary row */}
      <div className="summary-card" style={{ margin: '12px 16px', borderRadius: 'var(--radius-md)' }}>
        <div className="summary-item">
          <p className="summary-item-label">Receitas</p>
          <p className="summary-item-value text-income">{formatBRL(summary.income)}</p>
        </div>
        <div className="summary-item">
          <p className="summary-item-label">Despesas</p>
          <p className="summary-item-value text-expense">{formatBRL(summary.expense)}</p>
        </div>
        <div className="summary-item">
          <p className="summary-item-label">Saldo</p>
          <p className="summary-item-value" style={{ color: summary.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
            {formatBRL(summary.balance)}
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 16px 8px', overflowX: 'auto' }}>
        {(['all', 'pending', 'consolidated'] as FilterStatus[]).map(f => (
          <button
            key={f}
            className={`month-picker-item ${filterStatus === f ? 'active' : ''}`}
            onClick={() => setFilterStatus(f)}
            style={{ flexShrink: 0 }}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Consolidadas'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="page-container" style={{ flex: 1, paddingTop: 0 }}>
        {error && (
          <div className="error-banner" style={{ marginBottom: 12 }}>
            <AlertTriangle size={16} /><span>{error}</span>
          </div>
        )}

        {loading && <SkeletonList count={6} />}

        {!loading && groups.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: 40 }}>💳</div>
            <h3>Nenhuma transação</h3>
            <p>Não há transações para este período.</p>
          </div>
        )}

        {!loading && groups.map(({ date, items }) => (
          <div key={date} style={{ marginBottom: 8 }}>
            <p className="section-header" style={{ paddingTop: 8 }}>{formatDateHeader(date)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map(tx => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  selected={selected.has(tx.id)}
                  selectMode={selectMode}
                  onSelect={toggleSelect}
                  onEdit={(t) => navigate(`/app/transactions/${t.id}`)}
                  onDelete={(t) => askDelete([t.id], `"${t.description || 'esta transação'}"`)}
                  onConsolidate={handleConsolidate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      {!selectMode && (
        <button className="fab" onClick={() => navigate('/app/transactions/new')} aria-label="Nova transação">
          <Plus size={24} />
        </button>
      )}

      {/* Bulk action bar */}
      {selectMode && (
        <BulkActionBar
          count={selected.size}
          total={selectedTotal}
          allSelected={selected.size === transactions.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onConsolidate={handleBulkConsolidate}
          onDelete={() => askDelete(Array.from(selected), `${selected.size} transação(ões)`)}
        />
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir transação"
        message={`Tem certeza que deseja excluir ${confirmDelete?.label}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={confirmLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
