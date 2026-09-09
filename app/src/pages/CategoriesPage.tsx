import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getUserCategories, createCategory, deleteCategory } from '../services/categoryService'
import { Category, CategoryType } from '../types/category'
import CategoryIcon from '../components/ui/CategoryIcon'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TopBar from '../components/layout/TopBar'

const COLORS = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#6B7280','#0EA5E9']
const TYPE_LABELS: Record<CategoryType, string> = { income: 'Receitas', expense: 'Despesas', transfer: 'Transferências' }

export default function CategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CategoryType>('expense')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [newParentId, setNewParentId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [newError, setNewError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const cats = await getUserCategories(user.id)
    setCategories(cats)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  function handleTypeChange(t: CategoryType) {
    setNewType(t)
    setNewParentId('')
  }

  function handleClose() {
    setNewOpen(false)
    setNewName('')
    setNewParentId('')
    setNewError('')
  }

  async function handleCreate() {
    if (!user || !newName.trim()) { setNewError('Informe o nome'); return }
    setSaving(true); setNewError('')
    const result = await createCategory({
      userId: user.id, name: newName, type: newType, color: newColor,
      parentId: newParentId || undefined,
    })
    setSaving(false)
    if (!result) { setNewError('Erro ao criar categoria'); return }
    handleClose(); load()
  }

  async function handleDelete(cat: Category) {
    setDeleteLoading(true)
    const ok = await deleteCategory(cat.id)
    setDeleteLoading(false)
    if (!ok) { alert('Não é possível excluir — categoria tem transações vinculadas.'); return }
    setConfirmDelete(null); load()
  }

  const availableParents = useMemo(
    () => categories.filter(c => c.type === newType && !c.parent_id),
    [categories, newType]
  )

  const groups = useMemo(() =>
    (['expense', 'income', 'transfer'] as CategoryType[]).map(type => {
      const items = categories.filter(c => c.type === type)
      const parents = items.filter(c => !c.parent_id)
      const orphans = items.filter(c => c.parent_id && !items.find(p => p.id === c.parent_id))
      const hierarchical: { cat: Category; depth: number }[] = []
      for (const parent of parents) {
        hierarchical.push({ cat: parent, depth: 0 })
        const children = items.filter(c => c.parent_id === parent.id)
          .sort((a, b) => a.name.localeCompare(b.name))
        for (const child of children) {
          hierarchical.push({ cat: child, depth: 1 })
        }
      }
      for (const orphan of orphans) {
        hierarchical.push({ cat: orphan, depth: 0 })
      }
      return { type, label: TYPE_LABELS[type], hierarchical }
    }).filter(g => g.hierarchical.length > 0),
    [categories]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar
        title="Categorias"
        backHref="/app/settings"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}>
            <Plus size={15} /> Nova
          </button>
        }
      />
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 32 }}>Carregando...</p>}

        {!loading && groups.map(g => (
          <div key={g.type}>
            <p className="section-header">{g.label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.hierarchical.map(({ cat, depth }) => (
                <div
                  key={cat.id}
                  className="card"
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginLeft: depth === 1 ? 24 : 0,
                    borderLeft: depth === 1 ? '3px solid var(--color-border-slate)' : undefined,
                    borderRadius: depth === 1 ? '0 var(--radius-md) var(--radius-md) 0' : undefined,
                  }}
                >
                  <CategoryIcon name={cat.icon} color={cat.color} size={depth === 1 ? 28 : 36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: depth === 1 ? 13 : 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {cat.name}
                    </span>
                    {depth === 0 && categories.some(c => c.parent_id === cat.id) && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                        {categories.filter(c => c.parent_id === cat.id).length} subcategoria(s)
                      </span>
                    )}
                  </div>
                  {!cat.is_default && (
                    <button
                      className="tx-action-btn tx-action-delete"
                      onClick={() => setConfirmDelete(cat)}
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {!loading && categories.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>🏷️</div>
            <h3>Nenhuma categoria</h3>
          </div>
        )}
      </div>

      {/* New category modal */}
      <Modal open={newOpen} onClose={handleClose} title="Nova Categoria" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nome" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Alimentação" error={newError} />

          <div className="input-wrapper">
            <label className="input-label">Tipo</label>
            <div className="type-selector">
              {(['expense', 'income'] as CategoryType[]).map(t => (
                <button key={t} type="button" className={`type-selector-btn ${newType === t ? 'active' : ''}`} onClick={() => handleTypeChange(t)}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {availableParents.length > 0 && (
            <div className="input-wrapper">
              <label className="input-label">Categoria pai</label>
              <div className="input-container">
                <select
                  value={newParentId}
                  onChange={e => setNewParentId(e.target.value)}
                  className="input-field"
                  style={{ background: 'transparent' }}
                >
                  <option value="">Nenhuma (categoria principal)</option>
                  {availableParents.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="input-wrapper">
            <label className="input-label">Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c,
                    border: newColor === c ? '3px solid var(--color-text-heading)' : '2px solid transparent',
                    outline: newColor === c ? '2px solid white' : 'none',
                    outlineOffset: -1,
                    cursor: 'pointer', transition: 'transform 0.1s',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleCreate} loading={saving}>Criar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Excluir categoria"
        message={`Tem certeza que deseja excluir "${confirmDelete?.name}"?`}
        confirmLabel="Excluir"
        loading={deleteLoading}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
