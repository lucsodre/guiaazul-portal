import { useState, useEffect, useCallback } from 'react'
import { Settings2, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TopBar from '../components/layout/TopBar'
import MonthPicker from '../components/ui/MonthPicker'
import CategoryIcon from '../components/ui/CategoryIcon'
import { SkeletonCard } from '../components/ui/Skeleton'
import { getMonthBudgetSummary } from '../services/budgetService'
import { formatBRL } from '../utils/currency'
import type { MonthBudgetSummary, CategoryBudgetProgress, UntrackedSummary } from '../types/budget'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

function ProgressBar({ cat }: { cat: CategoryBudgetProgress }) {
  const eff = cat.effective_amount

  const consolePct = eff > 0 ? Math.min(cat.consolidated / eff, 1) * 100 : 0
  const pendPct    = eff > 0
    ? Math.min(cat.pending / eff, Math.max(0, 1 - cat.consolidated / eff)) * 100
    : 0

  const barColor =
    cat.status === 'over'    ? 'var(--color-expense)'  :
    cat.status === 'warning' ? 'var(--color-warning)'  :
    'var(--color-primary)'

  const pctLabel = cat.status === 'over'
    ? `❌ +${formatBRL(Math.abs(cat.remaining))}`
    : `${Math.round(cat.percentage * 100)}%${cat.status === 'warning' ? ' ⚠' : ''}`

  return (
    <div className="card" style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 0, borderLeft: cat.status === 'over' ? '3px solid var(--color-expense)' : 'none' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <CategoryIcon name={cat.category?.icon} color={cat.category?.color || 'var(--color-primary)'} size={30} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cat.category?.name}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: barColor, flexShrink: 0 }}>{pctLabel}</span>
      </div>

      {/* Bar */}
      <div style={{ height: 9, background: 'var(--color-border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
        {cat.status === 'over' ? (
          <div style={{ width: '100%', background: 'var(--color-expense)', height: '100%' }} />
        ) : (
          <>
            <div style={{ width: `${consolePct}%`, background: barColor, height: '100%' }} />
            <div style={{ width: `${pendPct}%`, background: 'var(--color-primary-pale)', height: '100%', opacity: 0.7 }} />
          </>
        )}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap' }}>
        <span>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: 'var(--color-primary)', marginRight: 3, verticalAlign: 'middle' }} />
          {formatBRL(cat.consolidated)} consol.
        </span>
        {cat.pending > 0 && (
          <span>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: 'var(--color-primary-pale)', marginRight: 3, verticalAlign: 'middle' }} />
            {formatBRL(cat.pending)} pend.
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>limite {formatBRL(cat.effective_amount)}</span>
      </div>

    </div>
  )
}

function UntrackedCard({ data }: { data: UntrackedSummary }) {
  const [open, setOpen] = useState(false)
  const total = data.consolidated + data.pending
  if (total === 0) return null

  return (
    <div className="card" style={{ padding: '10px 10px', borderLeft: '3px solid var(--color-text-subtle)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span style={{ fontSize: 20 }}>🏷️</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', textAlign: 'left' }}>
          Não identificadas
        </span>
        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', marginRight: 4 }}>
          {formatBRL(total)}
        </span>
        {open ? <ChevronUp size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
               : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
      </button>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {data.consolidated > 0 && (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: 'var(--color-text-subtle)', marginRight: 3, verticalAlign: 'middle' }} />
            {formatBRL(data.consolidated)} consol.
          </span>
        )}
        {data.pending > 0 && (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: 'var(--color-border)', marginRight: 3, verticalAlign: 'middle' }} />
            {formatBRL(data.pending)} pend.
          </span>
        )}
      </div>

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
          {data.categories.map((cat) => (
            <div key={cat.id ?? '__none__'} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CategoryIcon name={cat.icon} color={cat.color || 'var(--color-text-subtle)'} size={26} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cat.name}
              </span>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>
                  {formatBRL(cat.consolidated + cat.pending)}
                </span>
                {cat.pending > 0 && (
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--color-warning)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatBRL(cat.pending)} pend.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BudgetPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useWindowWidth() < 768

  const [date,    setDate]    = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [summary, setSummary] = useState<MonthBudgetSummary | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const data = await getMonthBudgetSummary(user.id, date)
      setSummary(data)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar orçamento')
    } finally {
      setLoading(false)
    }
  }, [user, date])

  useEffect(() => { load() }, [load])

  const configAction = (
    <button
      onClick={() => navigate('/app/budget/config')}
      style={{ padding: 6, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' }}
      title="Configurar orçamento"
    >
      <Settings2 size={20} />
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar title="Orçamento" actions={configAction} />
      <MonthPicker currentDate={date} onChange={setDate} />

      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 12, ...(isMobile ? { padding: '8px' } : {}) }}>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : !summary || summary.categories.length === 0 ? (
          /* Empty state */
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={26} style={{ color: 'var(--color-primary)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-heading)' }}>Nenhum orçamento configurado</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 260 }}>
              Defina receitas previstas e limites por categoria para acompanhar seus gastos.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/app/budget/config')}>
              Configurar orçamento
            </button>
          </div>
        ) : (
          <>
            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Orçado', value: summary.total_budgeted, color: 'var(--color-primary)' },
                { label: 'Realizado', value: summary.total_consolidated, color: 'var(--color-text)' },
                { label: 'Pendente', value: summary.total_pending, color: 'var(--color-warning)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="card" style={{ flex: 1, padding: '9px 8px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <p style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-subtle)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}>{formatBRL(value)}</p>
                </div>
              ))}
            </div>

            {/* Income summary (if configured) */}
            {summary.total_income_planned > 0 && (
              <div style={{ background: 'var(--color-income-bg)', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-income-dark)', marginBottom: 1 }}>Receita do mês</p>
                    <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-income)' }}>{formatBRL(summary.total_income_received)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--color-income-dark)', opacity: 0.8 }}>Prevista</p>
                    <p style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--color-income-dark)' }}>{formatBRL(summary.total_income_planned)}</p>
                  </div>
                </div>
                {summary.income_carryover !== 0 && (
                  <p style={{ marginTop: 6, fontSize: 11, fontVariantNumeric: 'tabular-nums', color: summary.income_carryover > 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                    {summary.income_carryover > 0
                      ? `↑ Saldo do mês anterior: +${formatBRL(summary.income_carryover)}`
                      : `↓ Déficit do mês anterior: ${formatBRL(Math.abs(summary.income_carryover))}`}
                  </p>
                )}
              </div>
            )}

            {/* Category progress cards */}
            <p className="section-header" style={{ marginBottom: 0 }}>CATEGORIAS</p>
            {summary.categories.map((cat) => (
              <ProgressBar key={cat.category?.id} cat={cat} />
            ))}
            <UntrackedCard data={summary.untracked} />
          </>
        )}
      </div>
    </div>
  )
}
