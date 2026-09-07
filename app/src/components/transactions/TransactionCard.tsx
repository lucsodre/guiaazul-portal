import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { Transaction } from '../../types/transaction'
import { formatBRL } from '../../utils/currency'
import { formatDateHeader } from '../../utils/date'
import CategoryIcon from '../ui/CategoryIcon'

interface TransactionCardProps {
  transaction: Transaction
  selected: boolean
  selectMode: boolean
  onSelect: (id: string) => void
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
  onConsolidate: (tx: Transaction) => void
}

export default function TransactionCard({
  transaction: tx,
  selected, selectMode,
  onSelect, onEdit, onDelete, onConsolidate,
}: TransactionCardProps) {
  const [hovered, setHovered] = useState(false)

  const isPending = !tx.is_consolidated
  const isExpense = tx.type === 'expense'
  const isIncome  = tx.type === 'income'

  const amountColor = isExpense ? 'var(--color-expense)'
                    : isIncome  ? 'var(--color-income)'
                                : 'var(--color-transfer)'

  const amountPrefix = isExpense ? '- ' : isIncome ? '+ ' : ''
  const amount = Math.abs(tx.amount)

  return (
    <div
      className={`tx-card ${isPending ? 'tx-card-pending' : ''} ${selected ? 'tx-card-selected' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectMode && onSelect(tx.id)}
    >
      {/* Checkbox (visible in select mode or hover) */}
      {(selectMode || hovered) && (
        <button
          className={`tx-checkbox ${selected ? 'tx-checkbox-checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSelect(tx.id) }}
          aria-label={selected ? 'Desmarcar' : 'Selecionar'}
        >
          {selected && <Check size={12} />}
        </button>
      )}

      {/* Category icon */}
      <CategoryIcon
        name={tx.category?.icon}
        color={tx.category?.color || 'var(--color-text-subtle)'}
        size={40}
      />

      {/* Description + meta */}
      <div className="tx-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <p className="tx-card-description truncate">{tx.description || 'Sem descrição'}</p>
          <span className="tx-card-amount" style={{ color: amountColor }}>
            {amountPrefix}{formatBRL(amount)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
          <span className="tx-card-meta">{tx.category?.name || 'Sem categoria'}</span>
          {tx.account?.name && (
            <>
              <span style={{ color: 'var(--color-border)', fontSize: 11 }}>•</span>
              <span className="tx-card-meta">{tx.account.name}</span>
            </>
          )}
          {isPending && (
            <span className="badge badge-warning badge-sm" style={{ marginLeft: 'auto' }}>pendente</span>
          )}
        </div>
      </div>

      {/* Hover actions (desktop) */}
      {hovered && !selectMode && (
        <div className="tx-card-actions" onClick={(e) => e.stopPropagation()}>
          {isPending && (
            <button
              className="tx-action-btn tx-action-consolidate"
              onClick={() => onConsolidate(tx)}
              title="Consolidar"
            >
              <Check size={15} />
            </button>
          )}
          <button
            className="tx-action-btn tx-action-edit"
            onClick={() => onEdit(tx)}
            title="Editar"
          >
            <Pencil size={15} />
          </button>
          <button
            className="tx-action-btn tx-action-delete"
            onClick={() => onDelete(tx)}
            title="Excluir"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
