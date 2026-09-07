import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Input from '../components/ui/Input'
import TopBar from '../components/layout/TopBar'

export default function ChangePasswordPage() {
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (newPassword !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err
      setSuccess(true)
    } catch (e: any) {
      setError(e.message || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <TopBar title="Alterar Senha" backHref="/app/settings" />
      <div className="page-container" style={{ maxWidth: 480 }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-heading)', marginBottom: 8 }}>Senha alterada!</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>Sua senha foi atualizada com sucesso.</p>
            <button className="btn btn-primary" onClick={() => navigate('/app/settings')}>
              Voltar às configurações
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div className="error-banner">{error}</div>}
            <Input
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              required
            />
            <div className="form-sticky-footer" style={{ position: 'static', marginTop: 8 }}>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? <span className="btn-spinner" /> : 'Alterar senha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
