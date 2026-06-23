import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, ListOrdered, Table2 } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { useAdmin } from '../context/AdminContext'
import { api } from '../lib/api'
import {
  activeAuditForVault,
  AUDIT_TYPE_DESCRIPTIONS,
  AUDIT_TYPE_LABELS,
  resolveVaultAuditWorkflow,
} from '../lib/auditWorkflow'
import type { AuditSession, AuditType } from '../types'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

export function AuditStartPage() {
  const { id: vaultId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getVault, loading: vaultLoading } = useVault()
  const { auditWorkflows } = useAdmin()
  const vault = vaultId ? getVault(vaultId) : undefined

  const [sessions, setSessions] = useState<AuditSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [auditType, setAuditType] = useState<AuditType>('standard')
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workflow = resolveVaultAuditWorkflow(auditWorkflows)
  const inProgress = activeAuditForVault(sessions)

  useEffect(() => {
    if (!vaultId) return
    api.getAudits(vaultId)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false))
  }, [vaultId])

  useEffect(() => {
    if (workflow?.auditType) setAuditType(workflow.auditType)
  }, [workflow?.auditType])

  const handleCancel = async () => {
    if (!inProgress) return
    if (
      !window.confirm(
        'Cancel the current audit? You can start a new one afterward without discarding progress unexpectedly.'
      )
    ) {
      return
    }
    setCancelling(true)
    setError(null)
    try {
      await api.cancelAudit(inProgress.id)
      setSessions((prev) => prev.filter((s) => s.id !== inProgress.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel audit')
    } finally {
      setCancelling(false)
    }
  }

  const handleStart = async () => {
    if (!vaultId) return
    setStarting(true)
    setError(null)
    try {
      const session = await api.createAudit(vaultId, { auditType, forceNew: true })
      navigate(`/vaults/${vaultId}/audit/${session.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start audit')
      setStarting(false)
    }
  }

  if (vaultLoading) {
    return <p className="text-sm text-vault-500">Loading vault…</p>
  }

  if (!vault) {
    return (
      <div className="space-y-2">
        <p className="text-vault-500">Vault not found.</p>
        <Link to="/vaults" className="text-gold-500 hover:underline">Back to vaults</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/vaults/${vaultId}`} className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Start Audit</h2>
          <p className="text-sm text-vault-500">{vault.name}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loadingSessions && inProgress && (
        <Card>
          <CardHeader title="Audit in progress" subtitle="You can continue the current audit or start a fresh one below." />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-vault-800">
                {AUDIT_TYPE_LABELS[inProgress.auditType ?? 'standard']} audit
              </p>
              <p className="text-xs text-vault-500">Started {new Date(inProgress.startedAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/vaults/${vaultId}/audit/${inProgress.id}`}
                className="rounded-md border border-vault-300 px-3 py-1.5 text-sm font-medium text-vault-700 hover:bg-vault-50"
              >
                Continue audit
              </Link>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Cancel audit'}
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Choose audit type"
          subtitle="Workflow default is a suggestion — pick the mode that fits this session."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['standard', 'advanced'] as AuditType[]).map((type) => {
            const selected = auditType === type
            const Icon = type === 'standard' ? Table2 : ListOrdered
            return (
              <button
                key={type}
                type="button"
                onClick={() => setAuditType(type)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selected
                    ? 'border-gold-400 bg-gold-50 ring-1 ring-gold-400'
                    : 'border-vault-200 bg-white hover:border-vault-300'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${selected ? 'text-gold-600' : 'text-vault-500'}`} />
                  <span className="font-semibold text-vault-900">{AUDIT_TYPE_LABELS[type]}</span>
                  {workflow?.auditType === type && (
                    <Badge variant="info">Workflow default</Badge>
                  )}
                </div>
                <p className="text-xs text-vault-500">{AUDIT_TYPE_DESCRIPTIONS[type]}</p>
              </button>
            )
          })}
        </div>

        {inProgress && (
          <p className="mt-4 text-xs text-amber-700">
            Starting a new audit will cancel the current in-progress audit for this vault.
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50"
        >
          <ClipboardCheck className="h-4 w-4" />
          {starting ? 'Starting…' : `Start ${AUDIT_TYPE_LABELS[auditType]} Audit`}
        </button>
      </Card>
    </div>
  )
}