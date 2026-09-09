import { useState } from 'react'
import { X, Check, RotateCcw, Trash2, CalendarDays } from 'lucide-react'
import { formatBRL } from '../../utils/currency'

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
  const [pickingDate, setPickingDate] = useState(false)
  const [dateVal, setDateVal] = useState('')

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setDateVal(v)
    if (v) {
      onChangeDate(v)
      setPickingDate(false)
      setDateVal('')
    }
  }

  return (
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
        {pickingDate ? (
          <>
            <input
              type="date"
              value={dateVal}
              onChange={handleDateChange}
              className="bulk-date-input"
              autoFocus
            />
            <button className="bulk-btn" onClick={() => { setPickingDate(false); setDateVal('') }} title="Cancelar">
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button className="bulk-btn bulk-btn-select-all" onClick={onSelectAll} title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}>
              <Check size={16} />
              <span>{allSelected ? 'Desmarcar' : 'Tudo'}</span>
            </button>
            <button className="bulk-btn bulk-btn-date" onClick={() => setPickingDate(true)} title="Mudar data">
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
          </>
        )}
      </div>
    </div>
  )
}
