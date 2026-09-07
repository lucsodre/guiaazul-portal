import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
  elevated?: boolean
}

export default function Card({ children, className = '', onClick, padding = 'md', elevated = false }: CardProps) {
  const paddingMap = { none: '', sm: 'card-pad-sm', md: '', lg: 'card-pad-lg' }

  return (
    <div
      className={`card ${paddingMap[padding]} ${elevated ? 'card-elevated' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </div>
  )
}
