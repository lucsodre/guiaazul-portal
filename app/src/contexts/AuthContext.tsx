import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react'
import { supabase, supabaseStorageKey } from '../lib/supabase'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { AppLoadError, runWithRetry } from '../lib/resilientLoad'

interface AuthContextData {
  user: User | null
  session: Session | null
  loading: boolean
  authIssueMessage: string | null
  isRecoveringSession: boolean
  signIn: (email: string, password: string) => Promise<{ error: unknown }>
  signUp: (
    email: string,
    password: string,
    data: { fullName: string; phone: string }
  ) => Promise<{ error: unknown; status: 'created' | 'already_registered_or_hidden' }>
  requestPasswordReset: (email: string) => Promise<{ error: unknown }>
  resendConfirmationEmail: (email: string) => Promise<{ error: unknown }>
  changePassword: (password: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<{ error: unknown }>
  retrySessionRecovery: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

const AUTH_LOAD_TIMEOUT_MS = 8000

function getPasswordResetRedirectUrl(): string {
  return `${window.location.origin}/app/reset-password`
}

function getEmailConfirmationRedirectUrl(): string {
  return `${window.location.origin}/app/login`
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error)) return false
  const message = String((error as { message: string }).message)
  return message.includes('Invalid Refresh Token') || message.includes('Refresh Token Not Found')
}

function isEmailNotConfirmedError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error)) return false
  const message = String((error as { message: string }).message || '').toLowerCase()
  return message.includes('email not confirmed') || message.includes('email_not_confirmed')
}

function isEmailConfirmationPending(targetUser: User | null): boolean {
  if (!targetUser?.email) return false
  return !targetUser.email_confirmed_at
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authIssueMessage, setAuthIssueMessage] = useState<string | null>(null)
  const [isRecoveringSession, setIsRecoveringSession] = useState(false)
  const userRef = useRef<User | null>(null)
  const sessionRef = useRef<Session | null>(null)

  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { sessionRef.current = session }, [session])

  const clearAuthStorage = useCallback(() => {
    try {
      localStorage.removeItem(supabaseStorageKey)
      Object.keys(localStorage)
        .filter(k => k.includes('supabase') || k.includes('sb-'))
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  }, [])

  const initializeAuth = useCallback(async () => {
    setAuthIssueMessage(null)

    // Phase 1: read from localStorage cache (no network)
    try {
      const raw = localStorage.getItem(supabaseStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        const expires = parsed?.expires_at ?? 0
        if (expires > Date.now() / 1000 + 10) {
          const cachedSession = parsed as Session
          if (cachedSession?.user && !isEmailConfirmationPending(cachedSession.user)) {
            setSession(cachedSession)
            setUser(cachedSession.user)
            setLoading(false)
          }
        }
      }
    } catch {}

    // Phase 2: validate via network
    try {
      const getSessionResult = await runWithRetry(
        () => supabase.auth.getSession(),
        { timeoutMs: 5000, timeoutLabel: 'auth_get_session', retries: 0, contextLabel: 'a sessão' }
      )
      const { data: { session }, error } = getSessionResult

      if (error) {
        if (isInvalidRefreshTokenError(error)) {
          await supabase.auth.signOut({ scope: 'local' })
        }
        clearAuthStorage()
        setSession(null); setUser(null)
        setAuthIssueMessage('Erro ao recuperar sua sessão. Faça login novamente.')
        return
      }

      if (isEmailConfirmationPending(session?.user ?? null)) {
        await supabase.auth.signOut({ scope: 'local' })
        clearAuthStorage()
        setSession(null); setUser(null)
        setAuthIssueMessage('Confirme seu email para continuar.')
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      setAuthIssueMessage(null)
    } catch (error) {
      if (error instanceof AppLoadError && error.kind === 'network') {
        setAuthIssueMessage('Instabilidade na internet ao validar sua sessão.')
      } else {
        setAuthIssueMessage('Não foi possível recuperar sua sessão.')
        if (isInvalidRefreshTokenError(error)) await supabase.auth.signOut({ scope: 'local' })
        clearAuthStorage()
        setSession(null); setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [clearAuthStorage])

  useEffect(() => {
    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'INITIAL_SESSION') return

        setSession(session)
        setUser(session?.user ?? null)

        if (isEmailConfirmationPending(session?.user ?? null)) {
          await supabase.auth.signOut({ scope: 'local' })
          clearAuthStorage()
          setSession(null); setUser(null)
          setAuthIssueMessage('Confirme seu email para continuar.')
          setLoading(false)
          return
        }

        if (!session) resetState()
        if (event === 'SIGNED_OUT' && !session) clearAuthStorage()
        setLoading(false)
        setAuthIssueMessage(null)
      }
    )

    return () => { subscription.unsubscribe() }
  }, [clearAuthStorage, initializeAuth])

  function resetState() {
    setSession(null); setUser(null)
  }

  async function signIn(email: string, password: string) {
    try {
      setAuthIssueMessage(null)
      clearAuthStorage()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (isEmailNotConfirmedError(error)) {
          return { error: { message: 'Seu email ainda não foi confirmado. Acesse sua caixa de entrada e clique no link de confirmação.' } }
        }
        return { error }
      }
      if (isEmailConfirmationPending(data.user)) {
        await supabase.auth.signOut({ scope: 'local' })
        clearAuthStorage()
        resetState()
        return { error: { message: 'Confirme seu email antes de entrar.' } }
      }
      setSession(data.session); setUser(data.user)
      setAuthIssueMessage(null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function signUp(email: string, password: string, data: { fullName: string; phone: string }) {
    try {
      clearAuthStorage()
      const { data: signUpData, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: getEmailConfirmationRedirectUrl(),
          data: { full_name: data.fullName, phone: data.phone },
        },
      })
      if (error) return { error, status: 'already_registered_or_hidden' as const }
      const hasIdentities = (signUpData.user as unknown as { identities?: unknown[] })?.identities?.length ?? 0 > 0
      return { error: null, status: hasIdentities ? 'created' as const : 'already_registered_or_hidden' as const }
    } catch (error) {
      return { error, status: 'already_registered_or_hidden' as const }
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch {}
    clearAuthStorage()
    setSession(null); setUser(null)
    setAuthIssueMessage(null)
  }

  const retrySessionRecovery = useCallback(async () => {
    setIsRecoveringSession(true); setLoading(true); setAuthIssueMessage(null)
    try { await initializeAuth() } finally { setIsRecoveringSession(false) }
  }, [initializeAuth])

  async function deleteAccount() {
    try {
      const token = sessionRef.current?.access_token
      if (!token) return { error: { message: 'Sessão inválida. Faça login novamente.' } }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const resData = await response.json()
      if (!response.ok) return { error: { message: resData.error || 'Erro ao excluir conta.' } }
      await signOut()
      return { error: null }
    } catch (error) { return { error } }
  }

  async function changePassword(password: string) {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      return { error }
    } catch (error) { return { error } }
  }

  async function requestPasswordReset(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      })
      return { error }
    } catch (error) { return { error } }
  }

  async function resendConfirmationEmail(email: string) {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      return { error }
    } catch (error) { return { error } }
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading, authIssueMessage, isRecoveringSession,
      signIn, signUp, requestPasswordReset, resendConfirmationEmail,
      changePassword, signOut, deleteAccount, retrySessionRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
