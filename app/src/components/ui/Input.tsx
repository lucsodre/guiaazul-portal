import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export default function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  type = 'text',
  className = '',
  id,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <div className={`input-container ${error ? 'input-error' : ''} ${icon ? 'input-with-icon' : ''}`}>
        {icon && <span className="input-icon-left">{icon}</span>}
        <input
          id={inputId}
          type={inputType}
          className="input-field"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="input-icon-right input-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {iconRight && !isPassword && (
          <span className="input-icon-right">{iconRight}</span>
        )}
      </div>
      {error && <p className="input-error-msg">{error}</p>}
      {hint && !error && <p className="input-hint">{hint}</p>}
    </div>
  )
}
