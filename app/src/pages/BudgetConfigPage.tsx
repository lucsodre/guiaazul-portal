import { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus, Check, X, Lightbulb } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import TopBar from '../components/layout/TopBar'
import CategoryIcon from '../components/ui/CategoryIcon'
import { SkeletonCard } from '../components/ui/Skeleton'
import {
  getIncomePlans, saveIncomePlan, deleteIncomePlan,
  getCategoryBudgets, saveCategoryBudget, updateCategoryBudgetAmount,
  deleteCategoryBudget, suggestBudgetAmount,
} from '../services/budgetService'
import { getUserCategories } from '../services/categoryService'
import { formatBRL } from '../utils/currency'
import type { IncomePlan, CategoryBudget } from '../types/budget'
import type { Category } from '../types/category'

const DAY_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `Dia ${i + 1}` })),
  { value: 31, label: 'Último dia do mês' },
]

export default function BudgetConfigPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [incomePlans, setIncomePlans]       = useState<IncomePlan[]>([])
  const [budgets, setBudgets]               = useState<CategoryBudget[]>([])
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])

  // Income form
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [incDesc,  setIncDesc]  = useState('')
  const [incAmt,   setIncAmt]   = useState('')
  const [incDay,   setIncDay]   = useState<number>(15)
  const [savingInc, setSavingInc] = useState(false)

  // Category budget form
  const [showCatForm, setShowCatForm] = useState(false)
  const [catId,    setCatId]    = useState('')
  const [catAmt,   setCatAmt]   = useState('')
  const [suggestion, setSuggestion] = useState<number | null>(null)
  const [loadingSugg, setLoadingSugg] = useState(false)
  const [savingCat, setSavingCat] = useState(false)

  // Inline edit of existing category amount
  const [editId,     setEditId]     = useState<string | null>(null)
  const [editAmt,    setEditAmt]    = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [plans, cats, allCats] = await Promise.all([
        getIncomePlans(user.id),
        getCategoryBudgets(user.id),
        getUserCategories(user.id, 'expense'),
      ])
      setIncomePlans(plans)
      setBudgets(cats)
      setExpenseCategories(allCats)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Categories not yet budgeted
  const budgetedIds = new Set(budgets.map((b) => b.category_id))
  const availableCategories = expenseCategories.filter((c) => !budgetedIds.has(c.id))

  // ── Income handlers ─────────────────────────────────────────────────────────

  async function handleSaveIncome() {
    if (!user || !incDesc.trim() || !incAmt) return
    setSavingInc(true)
    try {
      const plan = await saveIncomePlan(user.id, {
        description: incDesc.trim(),
        amount: parseFloat(incAmt),
        day_of_month: incDay,
      })
      if (plan) {
        setIncomePlans((prev) => [...prev, plan])
        setShowIncomeForm(false)
        setIncDesc(''); setIncAmt(''); setIncDay(15)
      }
    } finally { setSavingInc(false) }
  }

  async function handleDeleteIncome(id: string) {
    await deleteIncomePlan(id)
    setIncomePlans((prev) => prev.filter((p) => p.id !== id))
  }

  // ── Category budget handlers ─────────────────────────────────────────────────

  async function handleCategorySelect(id: string) {
    setCatId(id)
    setSuggestion(null)
    if (!id || !user) return
    setLoadingSugg(true)
    try {
      const s = await suggestBudgetAmount(user.id, id, new Date())
      if (s > 0) setSuggestion(s)
    } finally { setLoadingSugg(false) }
  }

  async function handleSaveCat() {
    if (!user || !catId || !catAmt) return
    setSavingCat(true)
    try {
      const budget = await saveCategoryBudget(user.id, {
        category_id: catId,
        monthly_amount: parseFloat(catAmt),
      })
      if (budget) {
        setBudgets((prev) => [...prev, budget])
        setShowCatForm(false)
        setCatId(''); setCatAmt(''); setSuggestion(null)
      }
    } finally { setSavingCat(false) }
  }

  async function handleDeleteBudget(id: string) {
    await deleteCategoryBudget(id)
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }

  function startEdit(budget: CategoryBudget) {
    setEditId(budget.id)
    setEditAmt(String(budget.monthly_amount))
  }

  async function handleSaveEdit(id: string) {
    const amount = parseFloat(editAmt)
    if (isNaN(amount) || amount < 0) { setEditId(null); return }
    setSavingEdit(true)
    try {
      const ok = await updateCategoryBudgetAmount(id, amount)
      if (ok) {
        setBudgets((prev) => prev.map((b) => b.id === id ? { ...b, monthly_amount: amount } : b))
        setEditId(null)
      }
    } finally { setSavingEdit(false) }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  const totalIncome  = incomePlans.reduce((s, p) => s + p.amount, 0)
  const totalBudgeted = budgets.reduce((s, b) => s + b.monthly_amount, 0)
  const totalFree    = totalIncome - totalBudgeted

  const s: React.CSSProperties = { flexShrink: 0 }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <TopBar title="Configurar Orçamento" backHref="/app/budget" />
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar title="Configurar Orçamento" backHref="/app/budget" />

      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Receitas previstas ─────────────────────────────────────── */}
        <div>
          <p className="section-header">RECEITAS PREVISTAS</p>
          <div className="settings-section" style={{ padding: 0 }}>

            {incomePlans.map((plan) => (
              <div key={plan.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: 'var(--color-income)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Dia</span>
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {plan.day_of_month === 31 ? '∞' : plan.day_of_month}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.description}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-income)', fontVariantNumeric: 'tabular-nums' }}>{formatBRL(plan.amount)}</p>
                </div>
                <button onClick={() => handleDeleteIncome(plan.id)} style={{ padding: 6, color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer', ...s }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Inline form */}
            {showIncomeForm && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Descrição (ex: Adiantamento Salário)"
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Valor"
                    min="0"
                    step="0.01"
                    value={incAmt}
                    onChange={(e) => setIncAmt(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-input"
                    value={incDay}
                    onChange={(e) => setIncDay(Number(e.target.value))}
                    style={{ flex: 1 }}
                  >
                    {DAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveIncome} disabled={savingInc || !incDesc.trim() || !incAmt}>
                    {savingInc ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowIncomeForm(false); setIncDesc(''); setIncAmt(''); setIncDay(15) }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {!showIncomeForm && (
              <button
                onClick={() => setShowIncomeForm(true)}
                style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, fontWeight: 500 }}
              >
                <Plus size={16} /> Adicionar receita
              </button>
            )}
          </div>
        </div>

        {/* ── Summary card ──────────────────────────────────────────────── */}
        {totalIncome > 0 && (
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-lighter) 100%)', borderRadius: 'var(--radius-md)', padding: '14px 16px', color: '#fff', boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total previsto / mês</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>{formatBRL(totalIncome)}</p>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontSize: 9, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orçado</p>
                <p style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#FCD34D' }}>{formatBRL(totalBudgeted)}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Livre</p>
                <p style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: totalFree >= 0 ? '#6EE7B7' : '#FCA5A5' }}>{formatBRL(totalFree)}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alocado</p>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{totalIncome > 0 ? Math.round(totalBudgeted / totalIncome * 100) : 0}%</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Limites por categoria ──────────────────────────────────────── */}
        <div>
          <p className="section-header">LIMITES POR CATEGORIA</p>
          <div className="settings-section" style={{ padding: 0 }}>

            {budgets.map((budget) => (
              <div key={budget.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <CategoryIcon
                  name={budget.category?.icon}
                  color={budget.category?.color || 'var(--color-primary)'}
                  size={34}
                />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {budget.category?.name}
                </span>

                {editId === budget.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <input
                      type="number"
                      className="form-input"
                      value={editAmt}
                      onChange={(e) => setEditAmt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(budget.id); if (e.key === 'Escape') setEditId(null) }}
                      style={{ width: 90, textAlign: 'right', padding: '4px 8px', fontSize: 13 }}
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(budget.id)} disabled={savingEdit} style={{ color: 'var(--color-income)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditId(null)} style={{ color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(budget)}
                    style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }}
                  >
                    {formatBRL(budget.monthly_amount)}
                  </button>
                )}

                <button onClick={() => handleDeleteBudget(budget.id)} style={{ padding: 6, color: 'var(--color-text-subtle)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Add category form */}
            {showCatForm && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  className="form-input"
                  value={catId}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  autoFocus
                >
                  <option value="">Selecionar categoria…</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Suggestion badge */}
                {(suggestion !== null || loadingSugg) && (
                  <button
                    onClick={() => suggestion && setCatAmt(String(suggestion))}
                    disabled={loadingSugg}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-warning-tint)', border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: suggestion ? 'pointer' : 'default', fontSize: 12, color: 'var(--color-warning-dark)', fontWeight: 500 }}
                  >
                    <Lightbulb size={13} />
                    {loadingSugg ? 'Calculando sugestão…' : `Sugestão (média 3 meses): ${formatBRL(suggestion!)}`}
                  </button>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Limite mensal (R$)"
                    min="0"
                    step="1"
                    value={catAmt}
                    onChange={(e) => setCatAmt(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveCat} disabled={savingCat || !catId || !catAmt}>
                    {savingCat ? 'Salvando…' : 'Adicionar'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowCatForm(false); setCatId(''); setCatAmt(''); setSuggestion(null) }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {!showCatForm && availableCategories.length > 0 && (
              <button
                onClick={() => setShowCatForm(true)}
                style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, fontWeight: 500 }}
              >
                <Plus size={16} /> Adicionar limite de categoria
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
