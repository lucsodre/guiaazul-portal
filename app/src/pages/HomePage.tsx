import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, AlertTriangle, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getDashboardData, formatDueDate, isOverdue,
  type DashboardData, type DashboardConsolidationFilter,
} from '../services/dashboardService'
import { getMonthlyExpensesByCategory, type CategoryExpenseItem } from '../services/reportService'
import { formatBRL, formatBRLCompact } from '../utils/currency'
import { formatDateShort } from '../utils/date'
import CategoryIcon from '../components/ui/CategoryIcon'
import DonutChart from '../components/ui/DonutChart'
import TopBar from '../components/layout/TopBar'
import { SkeletonCard, Skeleton } from '../components/ui/Skeleton'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState<DashboardData | null>(null)
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpenseItem[]>([])
  const [totalExpense, setTotalExpense] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllAccounts, setShowAllAccounts] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const [dash, report] = await Promise.all([
        getDashboardData(user.id, 'all'),
        getMonthlyExpensesByCategory(user.id, new Date()),
      ])
      setData(dash)
      setCategoryExpenses(report.categories.slice(0, 6))
      setTotalExpense(report.totalExpense)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const budgetProgress = data?.budgetUsage.percentage ?? 0
  const progressClass = budgetProgress >= 100 ? 'progress-fill--danger'
                      : budgetProgress >= 75  ? 'progress-fill--warn'
                                              : 'progress-fill--ok'

  const donutSegments = categoryExpenses.map(c => ({
    value: c.total, color: c.color, label: c.name,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar
        title="Início"
        actions={
          <button
            className="topbar-back"
            onClick={load}
            aria-label="Recarregar"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      <div className="page-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div className="error-banner">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Total Balance Card */}
        {loading ? <SkeletonCard lines={4} /> : data && (
          <div className="card card-lg" style={{ background: 'var(--color-primary)', color: '#fff' }}>
            <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Saldo Total
            </p>
            <p style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 16 }}>
              {formatBRL(data.totalBalance)}
            </p>

            {/* Account breakdown */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12 }}>
              {(showAllAccounts ? data.accounts : data.accounts.slice(0, 2)).map(acc => (
                <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, opacity: 0.85 }}>{acc.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{formatBRLCompact(acc.current_balance)}</span>
                </div>
              ))}
              {data.accounts.length > 2 && (
                <button
                  onClick={() => setShowAllAccounts(v => !v)}
                  style={{ fontSize: 12, opacity: 0.7, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginTop: 4 }}
                >
                  {showAllAccounts ? 'Mostrar menos' : `+ ${data.accounts.length - 2} conta(s)`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Budget thermometer */}
        {loading ? <SkeletonCard lines={3} /> : data?.budgetUsage.hasIncome && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-heading)' }}>Gastos do mês</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {data.budgetUsage.percentage}% da receita
              </span>
            </div>
            <div className="progress-track" style={{ height: 10 }}>
              <div
                className={`progress-fill ${progressClass}`}
                style={{ width: `${Math.min(budgetProgress, 100)}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-expense)' }}>
                Gasto: {formatBRLCompact(data.budgetUsage.spent)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-income)' }}>
                Receita: {formatBRLCompact(data.budgetUsage.income)}
              </span>
            </div>
          </div>
        )}

        {/* Upcoming transactions */}
        {loading ? <SkeletonCard lines={4} /> : (data?.upcomingTransactions.length ?? 0) > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Clock size={16} color="var(--color-warning)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-heading)' }}>Próximos vencimentos</span>
            </div>
            {data!.upcomingTransactions.map(tx => {
              const overdue = isOverdue(tx.transaction_date)
              return (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
                  <CategoryIcon
                    name={(tx as any).category?.icon}
                    color={(tx as any).category?.color || 'var(--color-text-subtle)'}
                    size={36}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {tx.description}
                    </p>
                    <p style={{ fontSize: 12, color: overdue ? 'var(--color-expense)' : 'var(--color-text-muted)' }}>
                      {formatDueDate(tx.transaction_date)}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-expense)', flexShrink: 0 }}>
                    {formatBRLCompact(Math.abs(tx.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Category donut */}
        {loading ? <SkeletonCard lines={5} /> : categoryExpenses.length > 0 && (
          <div className="card">
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-heading)', marginBottom: 16 }}>
              Gastos por categoria
            </p>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <DonutChart
                segments={donutSegments}
                total={totalExpense}
                size={160}
                strokeWidth={22}
                centerLabel="Despesas"
                centerValue={formatBRLCompact(totalExpense)}
              />
              <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryExpenses.map(cat => (
                  <div key={cat.categoryId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span className="truncate" style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>{cat.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', flexShrink: 0 }}>{cat.percentage}%</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-expense)', flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                      {formatBRLCompact(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={5} />
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/app/transactions/new')} aria-label="Nova transação">
        <Plus size={24} />
      </button>
    </div>
  )
}
