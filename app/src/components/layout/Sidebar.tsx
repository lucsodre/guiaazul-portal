import { NavLink, useNavigate } from 'react-router-dom'
import { House, List, PieChart, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/app/home',         icon: House,    label: 'Início' },
  { to: '/app/transactions', icon: List,     label: 'Transações' },
  { to: '/app/reports',      icon: PieChart, label: 'Relatórios' },
  { to: '/app/settings',     icon: Settings, label: 'Configurações' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'GA'

  async function handleSignOut() {
    await signOut()
    navigate('/app/login')
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <span className="sidebar-brand-icon">💙</span>
            <span className="sidebar-brand-name">Guia Azul</span>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} className="sidebar-link-icon" />
            {!collapsed && <span className="sidebar-link-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name truncate">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <p className="sidebar-user-email truncate">{user?.email}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="sidebar-avatar sidebar-avatar-sm" title={user?.email}>
            {initials}
          </div>
        )}
        <button
          className="sidebar-link sidebar-logout"
          onClick={handleSignOut}
          title="Sair"
        >
          <LogOut size={18} className="sidebar-link-icon" />
          {!collapsed && <span className="sidebar-link-label">Sair</span>}
        </button>
      </div>
    </aside>
  )
}
