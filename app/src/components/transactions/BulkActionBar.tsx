import { X, Check, Calendar, Wallet, Trash2 } from 'lucide-react'
import { formatBRL } from '../../utils/currency'

interface BulkActionBarProps {
  count: number
  total: number
  allSelected: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onConsolidate: () => void
  onDelete: () => void
}

export default function BulkActionBar({
  count, total, allSelected,
  onSelectAll, onClearSelection,
  onConsolidate, onDelete,
}: BulkActionBarProps) {
  return (
    <div className="bulk-bar">
      <div className="bulk-bar-info">
        <button className="bulk-bar-clear" onClick={onClearSelection} aria-label="Cancelar seleção">
          <X size={18} />
        </button>
        <span className="bulk-bar-count">{count} selecionado{count !== 1 ? 's' : ''}</span>
      </div>

      <div className="bulk-bar-total">
        <span>{formatBRL(Math.abs(total))}</span>
      </div>

      <div className="bulk-bar-actions">
        <button className="bulk-btn bulk-btn-select-all" onClick={onSelectAll} title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}>
          <Check size={16} />
          <span>{allSelected ? 'Desmarcar' : 'Tudo'}</span>
        </button>
        <button className="bulk-btn bulk-btn-consolidate" onClick={onConsolidate} title="Consolidar selecionados">
          <Check size={16} />
          <span>Consolidar</span>
        </button>
        <button className="bulk-btn bulk-btn-delete" onClick={onDelete} title="Excluir selecionados">
          <Trash2 size={16} />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  )
}
