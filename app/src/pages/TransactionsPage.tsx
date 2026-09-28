import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, AlertTriangle, CalendarCheck, Tag, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserTransactions, deleteTransaction, deleteTransactionsBatch,
  updateTransactionsBatch, getTransactionsSummary, consolidateTransaction,
  unconsolidateTransaction,
} from '../services/transactionService'
import { getUserBankAccounts } from '../services/bankAccountService'
import { getAllCategoriesWithHierarchy } from '../services/categoryService'
import { Transaction } from '../types/transaction'
import { BankAccount } from '../types/bankAccount'
import { Category } from '../types/category'
import CategoryIcon from '../components/ui/CategoryIcon'
import { formatBRL } from '../utils/currency'
import { formatDateHeader, getMonthStart, getMonthEnd } from '../utils/date'
import MonthPicker from '../components/ui/MonthPicker'
import TopBar from '../components/layout/TopBar'
import TransactionCard from '../components/transactions/TransactionCard'
import BulkActionBar from '../components/transactions/BulkActionBar'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { SkeletonList } from '../components/ui/Skeleton'

type FilterStatus = 'all' | 'pending' | 'consolidated'

// amounts are signed: income positive, expense negative, transfer neutral for total balance
function getTransactionImpact(tx: Transaction): number {
  return tx.type === 'transfer' ? 0 : tx.amount
}

function groupByDate(
  txs: Transaction[],
  initialBalance: number
): { date: string; items: Transaction[]; balance: number }[] {
  const sorted = [...txs].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  )
  const map = new Map<string, Transaction[]>()
  for (const tx of sorted) {
    if (!map.has(tx.transaction_date)) map.set(tx.transaction_date, [])
    map.get(tx.transaction_date)!.push(tx)
  }
  let running = initialBalance
  const result: { date: string; items: Transaction[]; balance: number }[] = []
  for (const [date, items] of map.entries()) {
    items.forEach(tx => { running += getTransactionImpact(tx) })
    result.push({ date, items, balance: running })
  }
  return result.reverse()
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
  const [filterAccount, setFilterAccount] = useState<string>('')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const selectMode = selected.size > 0

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [prevTxsAll, setPrevTxsAll] = useState<Transaction[]>([])

  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const [catFilterOpen, setCatFilterOpen] = useState(false)
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set())
  const [rootCategories, setRootCategories] = useState<Category[]>([])
  const [allCatMap, setAllCatMap] = useState<Map<string, Category>>(new Map())

  const pendingScrollRef = useRef<string | null>(null)

  const startDate = getMonthStart(currentDate)
  const endDate   = getMonthEnd(currentDate)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const isConsolidated = filterStatus === 'consolidated' ? true
                           : filterStatus === 'pending'      ? false
                           : undefined
      // prevMonthEnd = day before startDate (last day of previous month)
      const prevMonthEnd = new Date(new Date(startDate).getTime() - 86400000)
        .toISOString().split('T')[0]
      const [txs, sum, accs, prevTxs] = await Promise.all([
        getUserTransactions(user.id, { startDate, endDate, isConsolidated }),
        getTransactionsSummary(user.id, startDate, endDate),
        getUserBankAccounts(user.id),
        getUserTransactions(user.id, { endDate: prevMonthEnd }),
      ])
      setAccounts(accs.filter(a => a.is_active))
      setPrevTxsAll(prevTxs)
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

  useEffect(() => {
    if (!user) return
    getAllCategoriesWithHierarchy(user.id).then(cats => {
      const map = new Map(cats.map(c => [c.id, c]))
      setAllCatMap(map)
      setRootCategories(cats.filter(c => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name)))
    })
  }, [user])

  // Execute pending scroll after load completes (e.g. after switching month)
  useEffect(() => {
    if (loading || !pendingScrollRef.current) return
    const target = pendingScrollRef.current
    pendingScrollRef.current = null
    setTimeout(() => {
      document.getElementById(`section-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [loading])

  function scrollToToday() {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const sameMonth = currentDate.getFullYear() === today.getFullYear()
      && currentDate.getMonth() === today.getMonth()
    if (sameMonth) {
      document.getElementById(`section-${todayStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      pendingScrollRef.current = todayStr
      setCurrentDate(today)
    }
  }

  const previousBalance = useMemo(() => {
    const relevantAccs = filterAccount ? accounts.filter(a => a.id === filterAccount) : accounts
    const initBal = relevantAccs.reduce((s, a) => s + (a.initial_balance ?? 0), 0)
    let bal = initBal
    const relevantPrev = filterAccount ? prevTxsAll.filter(tx => tx.account_id === filterAccount) : prevTxsAll
    relevantPrev.forEach(tx => { bal += getTransactionImpact(tx) })
    return bal
  }, [filterAccount, accounts, prevTxsAll])

  const filtered = useMemo(() => {
    let result = transactions
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(tx =>
        tx.description?.toLowerCase().includes(q) ||
        tx.category?.name?.toLowerCase().includes(q) ||
        tx.account?.name?.toLowerCase().includes(q)
      )
    }
    if (filterAccount) {
      result = result.filter(tx => tx.account_id === filterAccount)
    }
    if (filterCategories.size > 0 && allCatMap.size > 0) {
      result = result.filter(tx => {
        if (!tx.category_id) return false
        const rootId = getRootCatId(tx.category_id)
        return rootId ? filterCategories.has(rootId) : false
      })
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, searchQuery, filterAccount, filterCategories, allCatMap])

  const groups = useMemo(() => groupByDate(filtered, previousBalance), [filtered, previousBalance])

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

  function toggleCategoryFilter(id: string) {
    setFilterCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getRootCatId(catId: string): string | null {
    let current = allCatMap.get(catId)
    let depth = 0
    while (current?.parent_id && depth < 5) {
      current = allCatMap.get(current.parent_id)
      depth++
    }
    return current?.id ?? null
  }

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

  async function handleUnconsolidate(tx: Transaction) {
    if (!user) return
    await unconsolidateTransaction(tx.id, user.id)
    await load()
  }

  async function handleBulkConsolidate() {
    if (!user || !selected.size) return
    await updateTransactionsBatch(Array.from(selected), user.id, { is_consolidated: true })
    await load()
  }

  async function handleBulkUnconsolidate() {
    if (!user || !selected.size) return
    await updateTransactionsBatch(Array.from(selected), user.id, { is_consolidated: false })
    await load()
  }

  async function handleBulkChangeDate(date: string) {
    if (!user || !selected.size) return
    await updateTransactionsBatch(Array.from(selected), user.id, { transaction_date: date })
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
          <>
            <button
              className="topbar-back"
              onClick={scrollToToday}
              aria-label="Ir para hoje"
              title="Ir para hoje"
            >
              <CalendarCheck size={18} />
            </button>
            <button
              className="topbar-back"
              onClick={() => setCatFilterOpen(true)}
              aria-label="Filtrar por categoria"
              title="Filtrar por categoria"
              style={{ position: 'relative' }}
            >
              <Tag size={18} style={{ color: filterCategories.size > 0 ? 'var(--color-primary)' : undefined }} />
              {filterCategories.size > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--color-primary)',
                  border: '1.5px solid var(--color-surface)',
                }} />
              )}
            </button>
            <button
              className="topbar-back"
              onClick={() => setSearchOpen(v => !v)}
              aria-label="Buscar"
            >
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
          </>
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
      <div className="summary-card summary-card--tx">
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
      <div className="tx-filter-pills">
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

        {accounts.length > 1 && (
          <>
            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-border)', margin: '2px 4px', flexShrink: 0 }} />
            <button
              className={`month-picker-item ${!filterAccount ? 'active' : ''}`}
              onClick={() => setFilterAccount('')}
              style={{ flexShrink: 0 }}
            >
              Todas contas
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                className={`month-picker-item ${filterAccount === acc.id ? 'active' : ''}`}
                onClick={() => setFilterAccount(acc.id)}
                style={{ flexShrink: 0 }}
              >
                {acc.name}
              </button>
            ))}
          </>
        )}
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

        {!loading && groups.map(({ date, items, balance }) => (
          <div key={date} id={`section-${date}`} style={{ marginBottom: 8 }}>
            <div className="section-header-row" style={{ paddingTop: 8 }}>
              <p className="section-header">{formatDateHeader(date)}</p>
              <span
                className="day-balance"
                style={{ color: balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
              >
                Saldo: {formatBRL(balance)}
              </span>
            </div>
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
                  onUnconsolidate={handleUnconsolidate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Category filter bottom sheet */}
      {catFilterOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }}
            onClick={() => setCatFilterOpen(false)}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--color-surface)',
            borderRadius: '16px 16px 0 0',
            zIndex: 50,
            maxHeight: '72vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-heading)' }}>
                Filtrar por categoria
                {filterCategories.size > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>
                    {filterCategories.size} selecionada{filterCategories.size > 1 ? 's' : ''}
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {filterCategories.size > 0 && (
                  <button
                    onClick={() => setFilterCategories(new Set())}
                    style={{ fontSize: 13, color: 'var(--color-expense)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={() => setCatFilterOpen(false)}
                  style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 32px' }}>
              {rootCategories.map(cat => {
                const isSelected = filterCategories.has(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategoryFilter(cat.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '9px 10px', borderRadius: 'var(--radius-md)', marginBottom: 2,
                      background: isSelected ? 'var(--color-primary-bg)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <CategoryIcon name={cat.icon} color={cat.color} size={28} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      {cat.name}
                    </span>
                    {isSelected && <Check size={16} color="var(--color-primary)" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

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
          onUnconsolidate={handleBulkUnconsolidate}
          onDelete={() => askDelete(Array.from(selected), `${selected.size} transação(ões)`)}
          onChangeDate={handleBulkChangeDate}
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
