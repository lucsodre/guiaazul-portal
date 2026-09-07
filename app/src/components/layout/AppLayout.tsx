import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'

const PAGE_TITLES: Record<string, string> = {
  '/app/home':                          'Início',
  '/app/transactions':                  'Transações',
  '/app/transactions/new':              'Nova Transação',
  '/app/reports':                       'Relatórios',
  '/app/settings':                      'Configurações',
  '/app/settings/categories':           'Categorias',
  '/app/settings/accounts':            'Contas Bancárias',
  '/app/settings/accounts/new':        'Nova Conta',
  '/app/settings/change-password':      'Alterar Senha',
}

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

export default function AppLayout() {
  const windowWidth = useWindowWidth()
  const location = useLocation()

  const isDesktop = windowWidth >= 1024
  const isTablet  = windowWidth >= 768 && windowWidth < 1024
  const isMobile  = windowWidth < 768

  // Sidebar collapsed by default on tablet, expanded on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => isTablet)

  useEffect(() => {
    setSidebarCollapsed(isTablet)
  }, [isTablet])

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Guia Azul'
  const isEditRoute = /^\/app\/transactions\/.+/.test(location.pathname) ||
                      /^\/app\/settings\/accounts\/.+/.test(location.pathname)

  return (
    <div className={`app-shell ${isDesktop ? 'has-sidebar' : ''} ${isMobile ? 'has-bottom-bar' : ''}`}>
      {/* Sidebar — desktop + tablet */}
      {!isMobile && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
      )}

      {/* Main content */}
      <main
        className="app-main"
        style={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'),
        }}
      >
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile */}
      {isMobile && <BottomTabBar />}
    </div>
  )
}
