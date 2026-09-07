import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, BarChart2, PieChart, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getComparativeReport, getMonthlyExpensesByCategory,
  type ComparativeReport, type CategoryExpenseItem, type ReportConsolidationFilter,
} from '../services/reportService'
import { addMonths, getMonthLabel } from '../utils/date'
import { formatBRL, formatBRLCompact } from '../utils/currency'
import MonthPicker from '../components/ui/MonthPicker'
import DonutChart from '../components/ui/DonutChart'
import CategoryIcon from '../components/ui/CategoryIcon'
import TopBar from '../components/layout/TopBar'
import { SkeletonCard } from '../components/ui/Skeleton'

type ViewMode = 'comparative' | 'charts'

export default function ReportsPage() {
  const { user } = useAuth()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewMode>('charts')
  const [filter, setFilter] = useState<ReportConsolidationFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [comparative, setComparative] = useState<ComparativeReport | null>(null)
  const [categoryData, setCategoryData] = useState<{ categories: CategoryExpenseItem[]; totalExpense: number }>({ categories: [], totalExpense: 0 })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const [comp, monthly] = await Promise.all([
        getComparativeReport(user.id, currentDate, filter),
        getMonthlyExpensesByCategory(user.id, currentDate, filter),
      ])
      setComparative(comp.report)
      setCategoryData({ categories: monthly.categories, totalExpense: monthly.totalExpense })
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }, [user, currentDate, filter])

  useEffect(() => { load() }, [load])

  const donutSegments = categoryData.categories.slice(0, 8).map(c => ({
    value: c.total, color: c.color, label: c.name,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar title="Relatórios" />

      <MonthPicker currentDate={currentDate} onChange={setCurrentDate} maxDate={new Date()} />

      {/* Controls */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        <div className="type-selector" style={{ flex: 1, minWidth: 240 }}>
          <button
            className={`type-selector-btn ${view === 'charts' ? 'active' : ''}`}
            onClick={() => setView('charts')}
          >
            <PieChart size={14} style={{ marginRight: 4 }} />
            Gráficos
          </button>
          <button
            className={`type-selector-btn ${view === 'comparative' ? 'active' : ''}`}
            onClick={() => setView('comparative')}
          >
            <BarChart2 size={14} style={{ marginRight: 4 }} />
            Comparativo
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'consolidated'] as ReportConsolidationFilter[]).map(f => (
            <button
              key={f}
              className={`month-picker-item ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todas' : 'Consolidadas'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div className="error-banner">
            <AlertTriangle size={16} /><span>{error}</span>
          </div>
        )}

        {loading && (
          <>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={6} />
          </>
        )}

        {/* Charts view */}
        {!loading && view === 'charts' && (
          <>
            {categoryData.totalExpense === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40 }}>📊</div>
                <h3>Nenhuma despesa</h3>
                <p>Não há despesas para este período.</p>
              </div>
            ) : (
              <>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-heading)', alignSelf: 'flex-start' }}>
                    Despesas por categoria — {getMonthLabel(currentDate)}
                  </p>
                  <DonutChart
                    segments={donutSegments}
                    total={categoryData.totalExpense}
                    size={200}
                    strokeWidth={26}
                    centerLabel="Total"
                    centerValue={formatBRLCompact(categoryData.totalExpense)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categoryData.categories.map(cat => (
                    <div key={cat.categoryId} className="card" style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <CategoryIcon name={cat.icon} color={cat.color} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{cat.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-expense)', flexShrink: 0, marginLeft: 8 }}>
                              {formatBRL(cat.total)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-track" style={{ height: 6, flex: 1 }}>
                              <div
                                className="progress-fill progress-fill--danger"
                                style={{ width: `${cat.percentage}%`, background: cat.color }}
                              />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{cat.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Comparative view */}
        {!loading && view === 'comparative' && (
          <>
            {/* Insights */}
            {comparative?.insights && comparative.insights.length > 0 && (
              <div className="card" style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-tint)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>Insights do mês</p>
                {comparative.insights.map((insight, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--color-primary)' }}>
                    {insight}
                  </p>
                ))}
              </div>
            )}

            {/* Totals */}
            {comparative && (
              <div className="summary-card">
                <div className="summary-item">
                  <p className="summary-item-label">{comparative.currentMonthLabel}</p>
                  <p className="summary-item-value text-expense">{formatBRLCompact(comparative.currentTotal)}</p>
                </div>
                <div className="summary-item">
                  <p className="summary-item-label">{comparative.previousMonthLabel}</p>
                  <p className="summary-item-value text-muted">{formatBRLCompact(comparative.previousTotal)}</p>
                </div>
                <div className="summary-item">
                  <p className="summary-item-label">Variação</p>
                  <p className="summary-item-value" style={{ color: comparative.totalVariationPct > 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                    {comparative.totalVariationPct > 0 ? '+' : ''}{comparative.totalVariationPct}%
                  </p>
                </div>
              </div>
            )}

            {/* Category table */}
            {comparative?.categories && comparative.categories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  <span>Categoria</span>
                  <span style={{ textAlign: 'right' }}>Atual</span>
                  <span style={{ textAlign: 'right' }}>Anterior</span>
                  <span style={{ textAlign: 'right' }}>Var.</span>
                </div>
                {comparative.categories.map(cat => (
                  <div key={cat.categoryId} className="card" style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-expense)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatBRLCompact(cat.current)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatBRLCompact(cat.previous)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                      {cat.trend === 'up'      && <TrendingUp  size={13} color="var(--color-expense)" />}
                      {cat.trend === 'down'    && <TrendingDown size={13} color="var(--color-income)" />}
                      {cat.trend === 'neutral' && <Minus size={13} color="var(--color-text-muted)" />}
                      <span style={{
                        fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                        color: cat.trend === 'up' ? 'var(--color-expense)' : cat.trend === 'down' ? 'var(--color-income)' : 'var(--color-text-muted)',
                      }}>
                        {cat.variationPct > 0 ? '+' : ''}{cat.variationPct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loading && (
              <div className="empty-state">
                <div style={{ fontSize: 40 }}>📊</div>
                <h3>Sem dados para comparar</h3>
                <p>Não há despesas neste ou no mês anterior.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
