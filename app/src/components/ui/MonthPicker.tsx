import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, getMonthLabel } from '../../utils/date'

interface MonthPickerProps {
  currentDate: Date
  onChange: (date: Date) => void
  maxDate?: Date
  minDate?: Date
}

export default function MonthPicker({ currentDate, onChange, maxDate, minDate }: MonthPickerProps) {
  const months = Array.from({ length: 5 }, (_, i) => addMonths(currentDate, i - 2))

  function handlePrev() {
    const prev = addMonths(currentDate, -1)
    if (!minDate || prev >= minDate) onChange(prev)
  }

  function handleNext() {
    const next = addMonths(currentDate, 1)
    if (!maxDate || next <= maxDate) onChange(next)
  }

  const canGoPrev = !minDate || addMonths(currentDate, -1) >= minDate
  const canGoNext = !maxDate || addMonths(currentDate, 1) <= maxDate

  return (
    <div className="month-picker">
      <button
        className="month-picker-btn"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Mês anterior"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="month-picker-months">
        {months.map((month, i) => {
          const isActive = month.getMonth() === currentDate.getMonth() &&
                           month.getFullYear() === currentDate.getFullYear()
          return (
            <button
              key={i}
              className={`month-picker-item ${isActive ? 'active' : ''}`}
              onClick={() => onChange(month)}
            >
              {isActive
                ? getMonthLabel(month)
                : month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
            </button>
          )
        })}
      </div>

      <button
        className="month-picker-btn"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Próximo mês"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
