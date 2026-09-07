import React, { useState, useRef, useEffect } from 'react'
import { formatInputBR } from '../../utils/currency'

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'normal' | 'large'
}

// Normalizes raw typed input to "NNNN,NN" format:
// - handles "." as thousands separator when a comma is present ("1.150,23" → "1150,23")
// - handles "." as decimal separator when there is no comma ("1150.23" → "1150,23")
function normalize(raw: string): string {
  let s = raw
  if (s.includes(',')) {
    s = s.replace(/\./g, '')          // dots are thousands separators
  } else {
    const lastDot = s.lastIndexOf('.')
    if (lastDot !== -1) {
      s = s.slice(0, lastDot) + ',' + s.slice(lastDot + 1)
      s = s.replace(/\./g, '')        // remove any remaining dots
    }
  }
  s = s.replace(/[^\d,]/g, '')        // keep only digits and comma
  const ci = s.indexOf(',')
  if (ci !== -1) {
    // only one comma, max 2 decimal digits
    s = s.slice(0, ci + 1) + s.slice(ci + 1).replace(/,/g, '').slice(0, 2)
  }
  return s
}

export default function CurrencyInput({
  value,
  onChange,
  label,
  error,
  placeholder = '0,00',
  disabled = false,
  className = '',
  size = 'normal',
}: CurrencyInputProps) {
  const [inputVal, setInputVal] = useState(value)
  const isFocused = useRef(false)

  // Sync display when value changes externally (form load / reset)
  useEffect(() => {
    if (!isFocused.current) setInputVal(value)
  }, [value])

  function handleFocus() {
    isFocused.current = true
    // Remove thousands dots so user can edit naturally: "1.150,23" → "1150,23"
    setInputVal((value || '').replace(/\./g, ''))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const norm = normalize(e.target.value)
    setInputVal(norm)
    if (!norm) { onChange(''); return }
    const num = parseFloat(norm.replace(',', '.'))
    if (!isNaN(num) && num > 0) onChange(formatInputBR(num))
  }

  function handleBlur() {
    isFocused.current = false
    const num = parseFloat((value || '').replace(/\./g, '').replace(',', '.'))
    setInputVal(!isNaN(num) && num > 0 ? formatInputBR(num) : '')
  }

  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className={`input-container currency-input-container ${error ? 'input-error' : ''}`}>
        <span className={`currency-prefix ${size === 'large' ? 'currency-prefix-large' : ''}`}>R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={inputVal}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field currency-field ${size === 'large' ? 'currency-field-large' : ''}`}
        />
      </div>
      {error && <p className="input-error-msg">{error}</p>}
    </div>
  )
}
