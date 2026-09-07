import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface TopBarProps {
  title: string
  backHref?: string
  actions?: React.ReactNode
  subtitle?: string
}

export default function TopBar({ title, backHref, actions, subtitle }: TopBarProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (backHref) navigate(backHref)
    else navigate(-1)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        {backHref !== undefined && (
          <button className="topbar-back" onClick={handleBack} aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="topbar-title">{title}</h1>
          {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  )
}
