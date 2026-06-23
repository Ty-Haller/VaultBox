import { useNavigate } from 'react-router-dom'
import { buildAuditPayload, isLineCounted, type AuditLineState } from '../../lib/auditSession'
import { api } from '../../lib/api'
import type { AuditSession } from '../../types'

interface UseAuditFormOptions {
  audit: AuditSession
  lines: AuditLineState[]
  setLines: React.Dispatch<React.SetStateAction<AuditLineState[]>>
  performedBy: string
  notes: string
  saving: boolean
  setSaving: (v: boolean) => void
  setSavedAt: (v: string | null) => void
  setError: (v: string | null) => void
  setAudit: (a: AuditSession) => void
}

export function useAuditForm({
  audit,
  lines,
  setLines,
  performedBy,
  notes,
  saving,
  setSaving,
  setSavedAt,
  setError,
  setAudit,
}: UseAuditFormOptions) {
  const navigate = useNavigate()

  const handleSaveDraft = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.saveAuditDraft(audit.id, buildAuditPayload(lines, performedBy, notes, 'save'))
      setAudit(updated)
      setLines((updated.lineItems ?? []).map((item) => ({ ...item, sessionQty: '' })))
      setSavedAt(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (
      !window.confirm(
        'Cancel this audit? Progress will be discarded and the session will be marked cancelled.'
      )
    ) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.cancelAudit(audit.id, { performedBy, notes })
      navigate(`/vaults/${audit.vaultId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel audit')
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    const incomplete = lines.filter((l) => !isLineCounted(l))
    if (incomplete.length > 0) {
      setError(
        `Enter counts for every line before completing (${incomplete.length} remaining).`
      )
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.completeAudit(audit.id, buildAuditPayload(lines, performedBy, notes, 'complete'))
      navigate(`/audits/${audit.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete audit')
      setSaving(false)
    }
  }

  return { handleSaveDraft, handleComplete, handleCancel, saving }
}