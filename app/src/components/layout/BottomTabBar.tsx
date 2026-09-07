import { NavLink } from 'react-router-dom'
import { House, List, PieChart, Settings } from 'lucide-react'

const TABS = [
  { to: '/app/home',         icon: House,    label: 'Início' },
  { to: '/app/transactions', icon: List,     label: 'Transações' },
  { to: '/app/reports',      icon: PieChart, label: 'Relatórios' },
  { to: '/app/settings',     icon: Settings, label: 'Config.' },
]

export default function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar">
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}
        >
          <Icon size={22} className="bottom-tab-icon" />
          <span className="bottom-tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
