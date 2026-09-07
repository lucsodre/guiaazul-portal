import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function reset() {
    setError('')
    setSuccess('')
  }

  function switchMode(m: Mode) {
    reset()
    setMode(m)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    reset()
    setLoading(true)

    try {
      function getErrMsg(err: unknown): string {
        if (err && typeof err === 'object' && 'message' in err) return String((err as {message: string}).message)
        return 'Ocorreu um erro. Tente novamente.'
      }

      if (mode === 'login') {
        const { error: err } = await signIn(email.trim(), password)
        if (err) { setError(getErrMsg(err)); return }
        navigate('/app/home', { replace: true })

      } else if (mode === 'signup') {
        if (!fullName.trim()) { setError('Informe seu nome completo.'); return }
        if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
        if (password !== confirmPassword) { setError('As senhas não coincidem.'); return }
        const { error: err } = await signUp(email.trim(), password, { fullName: fullName.trim(), phone: '' })
        if (err) { setError(getErrMsg(err)); return }
        setSuccess('Verifique seu e-mail para confirmar o cadastro.')

      } else {
        const { error: err } = await requestPasswordReset(email.trim())
        if (err) { setError(getErrMsg(err)); return }
        setSuccess('Enviamos as instruções para seu e-mail.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Background decoration */}
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">💙</div>
          <h1 className="auth-logo-name">Guia Azul</h1>
          <p className="auth-logo-tagline">Controle financeiro inteligente</p>
        </div>

        {/* Tab switcher (login/cadastro) */}
        {mode !== 'forgot' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Entrar
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Cadastrar
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="auth-section-title">Recuperar senha</div>
        )}

        {/* Messages */}
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {success && <div className="auth-alert auth-alert-success">{success}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-field">
              <div className="auth-input-container">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="auth-input"
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <div className="auth-input-container">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="auth-input"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="auth-field">
              <div className="auth-input-container">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  placeholder={mode === 'signup' ? 'Criar senha (mín. 6 caracteres)' : 'Senha'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="auth-input"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="auth-field">
              <div className="auth-input-container">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="auth-input"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="auth-forgot-link">
              <button type="button" onClick={() => switchMode('forgot')} className="auth-link">
                Esqueci minha senha
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (
              <span className="btn-spinner" />
            ) : (
              mode === 'login' ? 'Entrar' :
              mode === 'signup' ? 'Criar conta' :
              'Enviar instruções'
            )}
          </button>

          {mode === 'forgot' && (
            <button type="button" onClick={() => switchMode('login')} className="auth-link" style={{ marginTop: 12, display: 'block', textAlign: 'center' }}>
              ← Voltar ao login
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
