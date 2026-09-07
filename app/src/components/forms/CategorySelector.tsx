import { useState, useEffect } from 'react'
import { Sparkles, Search } from 'lucide-react'
import { Category } from '../../types/category'
import { TransactionType } from '../../types/transaction'
import { getUserCategories } from '../../services/categoryService'
import { useAuth } from '../../contexts/AuthContext'
import CategoryIcon from '../ui/CategoryIcon'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

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

  const filtered = search
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories

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

      <Modal open={open} onClose={() => setOpen(false)} title="Selecionar categoria" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
            {filtered.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`category-grid-item ${value === cat.id ? 'active' : ''}`}
                onClick={() => { onChange(cat.id); setOpen(false) }}
              >
                <CategoryIcon name={cat.icon} color={cat.color} size={36} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)', textAlign: 'center', marginTop: 4, lineHeight: 1.2 }}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}
