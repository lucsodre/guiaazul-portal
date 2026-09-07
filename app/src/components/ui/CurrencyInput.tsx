import React, { useRef } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { onChange(''); return }
    const number = parseInt(digits, 10) / 100
    onChange(formatInputBR(number))
  }

  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className={`input-container currency-input-container ${error ? 'input-error' : ''}`}>
        <span className={`currency-prefix ${size === 'large' ? 'currency-prefix-large' : ''}`}>R$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field currency-field ${size === 'large' ? 'currency-field-large' : ''}`}
        />
      </div>
      {error && <p className="input-error-msg">{error}</p>}
    </div>
  )
}
