import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tag, Wallet, Mail, Lock, Trash2, ChevronRight, LogOut, Info,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TopBar from '../components/layout/TopBar'

export default function SettingsPage() {
  const { user, signOut, deleteAccount } = useAuth()
  const navigate = useNavigate()

  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'GA'

  async function handleSignOut() {
    await signOut()
    navigate('/app/login', { replace: true })
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    setError('')
    try {
      await deleteAccount()
      navigate('/app/login', { replace: true })
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir conta')
    } finally {
      setDeleteLoading(false)
      setConfirmDelete(false)
    }
  }

  function Item({ icon: Icon, label, onClick, destructive = false }: { icon: React.ElementType; label: string; onClick: () => void; destructive?: boolean }) {
    return (
      <button className="settings-item" onClick={onClick} style={{ color: destructive ? 'var(--color-expense)' : undefined }}>
        <Icon size={18} className="settings-item-icon" style={{ color: destructive ? 'var(--color-expense)' : 'var(--color-primary)' }} />
        <span className="settings-item-label">{label}</span>
        <ChevronRight size={16} style={{ color: 'var(--color-text-subtle)' }} />
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar title="Configurações" />
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {error && <div className="error-banner">{error}</div>}

        {/* Account info */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="settings-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="truncate" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-heading)' }}>
              {user?.user_metadata?.full_name || 'Usuário'}
            </p>
            <p className="truncate" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user?.email}</p>
          </div>
        </div>

        {/* Settings section */}
        <div>
          <p className="section-header">CONFIGURAÇÕES</p>
          <div className="settings-section">
            <Item icon={Tag}    label="Categorias"      onClick={() => navigate('/app/settings/categories')} />
            <Item icon={Wallet} label="Contas Bancárias" onClick={() => navigate('/app/settings/accounts')} />
            <Item icon={Mail}   label="Fale Conosco"    onClick={() => window.location.href = 'mailto:contato@guiaazulfinancas.com.br'} />
            <Item icon={Lock}   label="Alterar Senha"   onClick={() => navigate('/app/settings/change-password')} />
          </div>
        </div>

        {/* Security section */}
        <div>
          <p className="section-header">CONTA</p>
          <div className="settings-section">
            <Item icon={LogOut} label="Sair da conta"   onClick={() => setConfirmSignOut(true)} />
            <Item icon={Trash2} label="Excluir conta"   onClick={() => setConfirmDelete(true)}  destructive />
          </div>
        </div>

        {/* About */}
        <div>
          <p className="section-header">SOBRE</p>
          <div className="settings-section">
            <div className="settings-item" style={{ cursor: 'default' }}>
              <Info size={18} className="settings-item-icon" style={{ color: 'var(--color-text-muted)' }} />
              <span className="settings-item-label" style={{ color: 'var(--color-text-muted)' }}>Versão 1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sair da conta"
        message="Tem certeza que deseja sair?"
        confirmLabel="Sair"
        variant="primary"
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir conta"
        message="Todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Excluir minha conta"
        loading={deleteLoading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
