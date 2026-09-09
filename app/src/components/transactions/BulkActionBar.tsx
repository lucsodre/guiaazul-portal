import { useState } from 'react'
import { X, Check, RotateCcw, Trash2, CalendarDays } from 'lucide-react'
import { formatBRL } from '../../utils/currency'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

interface BulkActionBarProps {
  count: number
  total: number
  allSelected: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onConsolidate: () => void
  onUnconsolidate: () => void
  onDelete: () => void
  onChangeDate: (date: string) => void
}

export default function BulkActionBar({
  count, total, allSelected,
  onSelectAll, onClearSelection,
  onConsolidate, onUnconsolidate, onDelete, onChangeDate,
}: BulkActionBarProps) {
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState('')

  function openDateModal() {
    setPendingDate(new Date().toISOString().split('T')[0])
    setDateModalOpen(true)
  }

  function confirmDate() {
    if (!pendingDate) return
    onChangeDate(pendingDate)
    setDateModalOpen(false)
  }

  function cancelDate() {
    setDateModalOpen(false)
    setPendingDate('')
  }

  return (
    <>
      <div className="bulk-bar">
        {/* Linha 1: contador + total */}
        <div className="bulk-bar-top">
          <div className="bulk-bar-info">
            <button className="bulk-bar-clear" onClick={onClearSelection} aria-label="Cancelar seleção">
              <X size={18} />
            </button>
            <span className="bulk-bar-count">{count} selecionado{count !== 1 ? 's' : ''}</span>
          </div>
          <div className="bulk-bar-total">
            {formatBRL(Math.abs(total))}
          </div>
        </div>

        {/* Linha 2: ações */}
        <div className="bulk-bar-actions">
          <button className="bulk-btn bulk-btn-select-all" onClick={onSelectAll} title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}>
            <Check size={16} />
            <span>{allSelected ? 'Desmarcar' : 'Tudo'}</span>
          </button>
          <button className="bulk-btn bulk-btn-date" onClick={openDateModal} title="Mudar data">
            <CalendarDays size={16} />
            <span>Data</span>
          </button>
          <button className="bulk-btn bulk-btn-consolidate" onClick={onConsolidate} title="Consolidar selecionados">
            <Check size={16} />
            <span>Consolidar</span>
          </button>
          <button className="bulk-btn bulk-btn-unconsolidate" onClick={onUnconsolidate} title="Desconsolidar selecionados">
            <RotateCcw size={16} />
            <span>Desconsolidar</span>
          </button>
          <button className="bulk-btn bulk-btn-delete" onClick={onDelete} title="Excluir selecionados">
            <Trash2 size={16} />
            <span>Excluir</span>
          </button>
        </div>
      </div>

      {/* Modal de confirmação de data */}
      <Modal open={dateModalOpen} onClose={cancelDate} title="Mudar data" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            Nova data para {count} transaç{count !== 1 ? 'ões' : 'ão'} selecionada{count !== 1 ? 's' : ''}:
          </p>
          <div className="input-container">
            <input
              type="date"
              value={pendingDate}
              onChange={e => setPendingDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={cancelDate}>Cancelar</Button>
            <Button onClick={confirmDate} disabled={!pendingDate}>Confirmar</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
