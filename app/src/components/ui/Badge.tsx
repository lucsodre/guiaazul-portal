type BadgeVariant = 'default' | 'income' | 'expense' | 'transfer' | 'warning' | 'primary' | 'muted'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  default:   'badge-default',
  income:    'badge-income',
  expense:   'badge-expense',
  transfer:  'badge-transfer',
  warning:   'badge-warning',
  primary:   'badge-primary',
  muted:     'badge-muted',
}

export default function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variantMap[variant]} ${size === 'sm' ? 'badge-sm' : ''} ${className}`}>
      {children}
    </span>
  )
}
