import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useVault } from '../context/VaultContext'
import { api } from '../lib/api'
import { toLineState, type AuditLineState } from '../lib/auditSession'
import type { AuditSession } from '../types'
import { AdvancedAuditView } from '../components/audits/AdvancedAuditView'
import { StandardAuditView } from '../components/audits/StandardAuditView'

export function AuditFormPage() {
  const { id: vaultId, sessionId } = useParams<{ id: string; sessionId: string }>()
  const { getVault, loading: vaultLoading } = useVault()
  const vault = vaultId ? getVault(vaultId) : undefined

  const [audit, setAudit] = useState<AuditSession | null>(null)
  const [lines, setLines] = useState<AuditLineState[]>([])
  const [performedBy, setPerformedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || vaultLoading) return
    api.getAudit(sessionId)
      .then((a) => {
        if (a.status === 'completed' || a.status === 'cancelled') {
          setError('This audit is no longer active.')
          return
        }
        if (vaultId && a.vaultId !== vaultId) {
          setError('Audit does not belong to this vault.')
          return
        }
        setAudit(a)
        setLines((a.lineItems ?? []).map(toLineState))
        setPerformedBy(a.performedBy ?? '')
        setNotes(a.notes ?? '')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load audit'))
      .finally(() => setLoading(false))
  }, [sessionId, vaultId, vaultLoading])

  if (vaultLoading || loading) {
    return <p className="text-sm text-vault-500">Loading audit…</p>
  }

  if (!vault) {
    return (
      <div className="space-y-2">
        <p className="text-vault-500">Vault not found.</p>
        <Link to="/vaults" className="text-gold-500 hover:underline">Back to vaults</Link>
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="space-y-3">
        <p className="text-red-600">{error ?? 'Audit not found'}</p>
        <div className="flex gap-3 text-sm">
          <Link to={`/vaults/${vaultId}`} className="text-gold-500 hover:underline">Back to vault</Link>
          <Link to={`/vaults/${vaultId}/audit`} className="text-gold-500 hover:underline">Start new audit</Link>
        </div>
      </div>
    )
  }

  const shared = {
    vaultId: vaultId!,
    vaultName: vault.name,
    audit,
    lines,
    setLines,
    performedBy,
    setPerformedBy,
    notes,
    setNotes,
    saving,
    setSaving,
    savedAt,
    setSavedAt,
    error,
    setError,
    setAudit,
  }

  return audit.auditType === 'advanced'
    ? <AdvancedAuditView {...shared} />
    : <StandardAuditView {...shared} />
}