import { useState, useEffect } from 'react'
import { RefreshCw, Link2, Lock, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getPluggyProfile,
  savePluggyItemId,
  savePluggyFromDate,
  listPluggyAccounts,
  triggerPluggySync,
  linkBankAccountToPluggy,
  getBankAccountsWithPluggyId,
  PluggyAccount,
} from '../../services/pluggyService'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PluggySync() {
  const { user } = useAuth()

  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [itemId, setItemId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [savingFromDate, setSavingFromDate] = useState(false)

  const [pluggyAccounts, setPluggyAccounts] = useState<PluggyAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<
    { id: string; name: string; pluggy_account_id: string | null; is_active: boolean }[]
  >([])

  const [syncing, setSyncing] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [savingItemId, setSavingItemId] = useState(false)

  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    getPluggyProfile(user.id).then(profile => {
      if (!profile) return
      setEnabled(profile.pluggy_enabled)
      setItemId(profile.pluggy_item_id ?? '')
      setFromDate(profile.pluggy_sync_from_date ?? '')
      setLastSync(profile.pluggy_last_sync)
    })
    getBankAccountsWithPluggyId(user.id).then(setBankAccounts)
  }, [user])

  // ── Não habilitado ──
  if (enabled === false) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
      }}>
        <Lock size={18} color="var(--color-text-muted)" />
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Sincronização bancária não habilitada para esta conta.{' '}
          <strong>Entre em contato com o administrador para solicitar acesso.</strong>
        </p>
      </div>
    )
  }

  if (enabled === null) return null // loading silencioso

  // ── Habilitado ──
  async function handleSaveItemId() {
    if (!user || !itemId.trim()) return
    setSavingItemId(true)
    const ok = await savePluggyItemId(user.id, itemId.trim())
    setSavingItemId(false)
    if (ok) setSyncMsg({ type: 'success', text: 'Item ID salvo.' })
    else setSyncMsg({ type: 'error', text: 'Erro ao salvar Item ID.' })
  }

  async function handleSaveFromDate() {
    if (!user || !fromDate) return
    setSavingFromDate(true)
    const ok = await savePluggyFromDate(user.id, fromDate)
    setSavingFromDate(false)
    if (ok) setSyncMsg({ type: 'success', text: 'Data de início salva.' })
    else setSyncMsg({ type: 'error', text: 'Erro ao salvar data.' })
  }

  async function handleListAccounts() {
    if (!user) return
    setLoadingAccounts(true)
    setSyncMsg(null)
    const result = await listPluggyAccounts(user.id)
    setLoadingAccounts(false)
    if (result.error) {
      setSyncMsg({ type: 'error', text: result.error })
    } else {
      setPluggyAccounts(result.accounts ?? [])
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    const result = await triggerPluggySync()
    setSyncing(false)
    if (result.ok) {
      const now = new Date().toISOString()
      setLastSync(now)
      setSyncMsg({
        type: 'success',
        text: `${result.synced} transação(ões) importada(s), ${result.skipped} ignorada(s).`,
      })
    } else {
      setSyncMsg({ type: 'error', text: result.error ?? 'Erro na sincronização.' })
    }
  }

  async function handleLinkAccount(bankAccountId: string, pluggyAccountId: string) {
    await linkBankAccountToPluggy(bankAccountId, pluggyAccountId)
    setBankAccounts(prev =>
      prev.map(a => a.id === bankAccountId ? { ...a, pluggy_account_id: pluggyAccountId || null } : a),
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Status + botão sync */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '12px 16px', borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            Sincronização automática ativa
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            {lastSync ? `Última sync: ${formatDateTime(lastSync)}` : 'Nunca sincronizado'}
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ gap: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={handleSync}
          disabled={syncing || !itemId.trim()}
        >
          <RefreshCw size={14} className={syncing ? 'spin' : ''} />
          {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </div>

      {/* Feedback */}
      {syncMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13,
          background: syncMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: syncMsg.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${syncMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
        }}>
          {syncMsg.text}
        </div>
      )}

      {/* Configurações avançadas */}
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', cursor: 'pointer', color: 'var(--color-primary)',
          fontSize: 13, fontWeight: 600, padding: '4px 0',
        }}
        onClick={() => setShowConfig(v => !v)}
      >
        {showConfig ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        Configurações de conexão
      </button>

      {showConfig && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 16,
          padding: 16, borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)', background: 'var(--color-surface)',
        }}>
          {/* Item ID */}
          <div className="input-wrapper">
            <label className="input-label">Item ID do Itaú (Pluggy)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input-container" style={{ flex: 1 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="ex: 2e7b2b3d-1234-5678-abcd-..."
                  value={itemId}
                  onChange={e => setItemId(e.target.value)}
                />
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleSaveItemId}
                disabled={savingItemId || !itemId.trim()}
                style={{ flexShrink: 0 }}
              >
                {savingItemId ? '…' : <Check size={15} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Encontre o itemId no dashboard da Pluggy em Connections.
            </p>
          </div>

          {/* Data de início da sincronização */}
          <div className="input-wrapper">
            <label className="input-label">Sincronizar transações a partir de</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="input-container" style={{ flex: 1 }}>
                <input
                  type="date"
                  className="input-field"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleSaveFromDate}
                disabled={savingFromDate || !fromDate}
                style={{ flexShrink: 0 }}
              >
                {savingFromDate ? '…' : <Check size={15} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Apenas transações nesta data ou após serão importadas. Defina o dia seguinte ao seu último lançamento manual.
            </p>
          </div>

          {/* Mapeamento de contas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label className="input-label" style={{ margin: 0 }}>
                Vincular contas Pluggy → Guia Azul
              </label>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={handleListAccounts}
                disabled={loadingAccounts || !itemId.trim()}
              >
                <Link2 size={13} />
                {loadingAccounts ? 'Carregando…' : 'Buscar contas Pluggy'}
              </button>
            </div>

            {bankAccounts.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Nenhuma conta bancária cadastrada no Guia Azul.
              </p>
            )}

            {bankAccounts.map(ba => (
              <div key={ba.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: 'var(--color-text)' }}>
                  {ba.name}
                </span>
                <select
                  style={{
                    fontSize: 12, padding: '6px 8px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', maxWidth: 220,
                  }}
                  value={ba.pluggy_account_id ?? ''}
                  onChange={e => handleLinkAccount(ba.id, e.target.value)}
                >
                  <option value="">— não vinculada —</option>
                  {pluggyAccounts.map(pa => (
                    <option key={pa.id} value={pa.id}>
                      {pa.name} ({pa.type})
                    </option>
                  ))}
                  {/* Se já há um ID salvo mas a lista ainda não foi carregada */}
                  {ba.pluggy_account_id && !pluggyAccounts.find(p => p.id === ba.pluggy_account_id) && (
                    <option value={ba.pluggy_account_id}>{ba.pluggy_account_id}</option>
                  )}
                </select>
              </div>
            ))}

            {pluggyAccounts.length > 0 && (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                Selecione qual conta Pluggy (banco real) corresponde a cada conta no Guia Azul.
                Se não vincular, as transações vão para a conta principal.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
