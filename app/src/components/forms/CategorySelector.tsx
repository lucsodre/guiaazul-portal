import { useState, useEffect, useMemo } from 'react'
import { Sparkles, Search } from 'lucide-react'
import { Category } from '../../types/category'
import { TransactionType } from '../../types/transaction'
import { getUserCategories } from '../../services/categoryService'
import { useAuth } from '../../contexts/AuthContext'
import CategoryIcon from '../ui/CategoryIcon'
import Modal from '../ui/Modal'

interface CategorySelectorProps {
  value: string
  onChange: (categoryId: string) => void
  transactionType: TransactionType
  description?: string
  error?: string
}

export default function CategorySelector({ value, onChange, transactionType, description, error }: CategorySelectorProps) {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const typeForCategory = transactionType === 'transfer' ? undefined : transactionType

  useEffect(() => {
    if (!user) return
    getUserCategories(user.id, typeForCategory).then(setCategories)
  }, [user, typeForCategory])

  const selected = categories.find(c => c.id === value)

  const isSearching = Boolean(search.trim())

  // Flat list for search mode
  const flatFiltered = useMemo(() =>
    categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  )

  // Hierarchical list for normal mode
  const hierarchicalItems = useMemo((): { cat: Category; depth: number }[] => {
    const parents = categories.filter(c => !c.parent_id)
    const result: { cat: Category; depth: number }[] = []
    for (const parent of parents) {
      result.push({ cat: parent, depth: 0 })
      categories
        .filter(c => c.parent_id === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(child => result.push({ cat: child, depth: 1 }))
    }
    // Orphan children (parent not loaded/visible)
    categories
      .filter(c => c.parent_id && !categories.find(p => p.id === c.parent_id))
      .forEach(orphan => result.push({ cat: orphan, depth: 0 }))
    return result
  }, [categories])

  function select(cat: Category) {
    onChange(cat.id)
    setOpen(false)
    setSearch('')
  }

  async function handleAiSuggest() {
    if (!description?.trim() || !user) return
    setAiLoading(true)
    try {
      const { suggestCategoryFromDescription } = await import('../../services/aiAgentService')
      const suggestion = await suggestCategoryFromDescription(description, user.id)
      if (suggestion?.categoryId) onChange(suggestion.categoryId)
    } catch {
      // AI suggestion failed — ignore silently
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      <div className="input-wrapper">
        <label className="input-label">Categoria</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`category-selector-btn ${error ? 'input-error' : ''}`}
            onClick={() => setOpen(true)}
          >
            {selected ? (
              <>
                <CategoryIcon name={selected.icon} color={selected.color} size={28} />
                <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{selected.name}</span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: 'var(--color-text-subtle)' }}>Selecionar categoria</span>
            )}
          </button>

          {description && description.length > 3 && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              style={{ flexShrink: 0 }}
              onClick={handleAiSuggest}
              disabled={aiLoading}
              title="Sugerir com IA"
            >
              <Sparkles size={16} />
              {aiLoading ? '...' : 'IA'}
            </button>
          )}
        </div>
        {error && <p className="input-error-msg">{error}</p>}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setSearch('') }} title="Selecionar categoria" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Search */}
          <div className="input-container input-with-icon">
            <span className="input-icon-left"><Search size={16} /></span>
            <input
              type="text"
              className="input-field"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 4 }}
            />
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 420, overflowY: 'auto' }}>
            {isSearching ? (
              flatFiltered.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 14, color: 'var(--color-text-muted)' }}>
                  Nenhuma categoria encontrada
                </p>
              ) : (
                flatFiltered.map(cat => (
                  <CategoryListRow
                    key={cat.id}
                    cat={cat}
                    depth={0}
                    selected={value === cat.id}
                    onSelect={select}
                  />
                ))
              )
            ) : (
              hierarchicalItems.map(({ cat, depth }, idx) => {
                // Thin divider before each parent group (except first)
                const showDivider = depth === 0 && idx > 0
                return (
                  <div key={cat.id}>
                    {showDivider && (
                      <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                    )}
                    <CategoryListRow
                      cat={cat}
                      depth={depth}
                      selected={value === cat.id}
                      onSelect={select}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}

function CategoryListRow({
  cat, depth, selected, onSelect,
}: {
  cat: Category
  depth: number
  selected: boolean
  onSelect: (cat: Category) => void
}) {
  const isChild = depth === 1
  return (
    <button
      type="button"
      onClick={() => onSelect(cat)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: isChild ? '7px 12px 7px 36px' : '9px 12px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: selected ? 'var(--color-primary-bg)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-alt)' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <CategoryIcon name={cat.icon} color={cat.color} size={isChild ? 26 : 34} />
      <span style={{
        fontSize: isChild ? 13 : 14,
        fontWeight: isChild ? 500 : 600,
        color: selected ? 'var(--color-primary)' : isChild ? 'var(--color-text-secondary)' : 'var(--color-text)',
        flex: 1,
        textAlign: 'left',
      }}>
        {cat.name}
      </span>
      {selected && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
      )}
    </button>
  )
}
