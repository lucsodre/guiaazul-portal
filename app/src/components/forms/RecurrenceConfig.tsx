import { RecurrenceType } from '../../types/transaction'
import { toInputDate, fromInputDate } from '../../utils/date'

interface RecurrenceConfigProps {
  isRecurring: boolean
  onToggle: (v: boolean) => void
  isIndefinite: boolean
  onToggleIndefinite: (v: boolean) => void
  recurrenceType: RecurrenceType
  onRecurrenceTypeChange: (v: RecurrenceType) => void
  installmentsTotal: number
  onInstallmentsTotalChange: (v: number) => void
  installmentsStart: number
  onInstallmentsStartChange: (v: number) => void
  endDate: Date | null
  onEndDateChange: (v: Date | null) => void
}

const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: 'daily',   label: 'Diário' },
  { value: 'weekly',  label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly',  label: 'Anual' },
]

export default function RecurrenceConfig({
  isRecurring, onToggle,
  isIndefinite, onToggleIndefinite,
  recurrenceType, onRecurrenceTypeChange,
  installmentsTotal, onInstallmentsTotalChange,
  installmentsStart, onInstallmentsStartChange,
  endDate, onEndDateChange,
}: RecurrenceConfigProps) {
  return (
    <div className="recurrence-container">
      {/* Toggle repetir */}
      <div className="recurrence-toggle-row">
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Repetir transação</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Parcelamento ou recorrência</p>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={isRecurring} onChange={e => onToggle(e.target.checked)} />
          <span className="toggle-track" />
        </label>
      </div>

      {isRecurring && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          {/* Parcelas fixas vs indefinido */}
          <div className="type-selector">
            <button
              type="button"
              className={`type-selector-btn ${!isIndefinite ? 'active' : ''}`}
              onClick={() => onToggleIndefinite(false)}
            >
              Parcelas fixas
            </button>
            <button
              type="button"
              className={`type-selector-btn ${isIndefinite ? 'active' : ''}`}
              onClick={() => onToggleIndefinite(true)}
            >
              Prazo indefinido
            </button>
          </div>

          {!isIndefinite ? (
            /* Parcelas fixas */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-wrapper">
                <label className="input-label">Total de parcelas</label>
                <div className="input-container">
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={installmentsTotal}
                    onChange={e => onInstallmentsTotalChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-field"
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>
              <div className="input-wrapper">
                <label className="input-label">Parcela inicial</label>
                <div className="input-container">
                  <input
                    type="number"
                    min={1}
                    max={installmentsTotal}
                    value={installmentsStart}
                    onChange={e => onInstallmentsStartChange(Math.max(1, Math.min(installmentsTotal, parseInt(e.target.value) || 1)))}
                    className="input-field"
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Prazo indefinido */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-wrapper">
                <label className="input-label">Frequência</label>
                <div className="type-selector" style={{ gap: 4 }}>
                  {RECURRENCE_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      type="button"
                      className={`type-selector-btn ${recurrenceType === rt.value ? 'active' : ''}`}
                      onClick={() => onRecurrenceTypeChange(rt.value)}
                      style={{ fontSize: 12 }}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-wrapper">
                <label className="input-label">Data de término (opcional)</label>
                <div className="input-container">
                  <input
                    type="date"
                    className="input-field"
                    value={endDate ? toInputDate(endDate) : ''}
                    onChange={e => onEndDateChange(e.target.value ? fromInputDate(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
