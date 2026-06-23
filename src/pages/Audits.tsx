import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardCheck, Shield, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import type { AuditSession } from '../types'
import { formatDateTime } from '../lib/utils'
import { Card, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'

function auditRowLink(session: AuditSession): string {
  if (session.status === 'in_progress' || session.status === 'draft') {
    return `/vaults/${session.vaultId}/audit/${session.id}`
  }
  return `/audits/${session.id}`
}

export function Audits() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<AuditSession[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadSessions = () => {
    setLoading(true)
    api.getAudits()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const handleCancel = async (session: AuditSession) => {
    if (
      !window.confirm(
        `Cancel the in-progress audit for ${session.vaultName}? Progress will be discarded.`
      )
    ) {
      return
    }
    setCancellingId(session.id)
    try {
      await api.cancelAudit(session.id)
      loadSessions()
    } catch {
      // keep list as-is on failure
    } finally {
      setCancellingId(null)
    }
  }

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [sessions]
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-vault-900">Audit History</h2>
        <p className="text-sm text-vault-500">
          Click a row to open the audit report, or continue an in-progress audit
        </p>
      </div>

      {loading ? (
        <p className="text-vault-500">Loading audit history…</p>
      ) : (
        <Card>
          <CardHeader
            title="Audit Sessions"
            subtitle={`${sessions.length} total — start new audits from any vault detail page`}
          />
          {sorted.length === 0 ? (
            <p className="text-sm text-vault-500">
              No audits yet. Open a <Link to="/vaults" className="text-gold-500 hover:underline">vault</Link> and click Perform Audit.
            </p>
          ) : (
            <DataTable
              keyField="id"
              data={sorted}
              onRowClick={(s) => navigate(auditRowLink(s))}
              columns={[
                {
                  key: 'audit',
                  header: 'Audit',
                  render: (s) => (
                    <Link
                      to={auditRowLink(s)}
                      className="font-medium text-gold-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {s.status === 'completed'
                        ? `${s.vaultName} — ${formatDateTime(s.completedAt ?? s.startedAt)}`
                        : s.status === 'cancelled'
                          ? `${s.vaultName} (cancelled)`
                          : `${s.vaultName} (in progress)`}
                    </Link>
                  ),
                },
                {
                  key: 'vault',
                  header: 'Vault',
                  render: (s) => (
                    <Link
                      to={`/vaults/${s.vaultId}`}
                      className="inline-flex items-center gap-1 text-vault-600 hover:text-gold-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {s.vaultName}
                    </Link>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (s) => (
                    <Badge
                      variant={
                        s.status === 'completed'
                          ? 'success'
                          : s.status === 'cancelled'
                            ? 'default'
                            : 'info'
                      }
                    >
                      {s.status.replace('_', ' ')}
                    </Badge>
                  ),
                },
                { key: 'started', header: 'Started', render: (s) => formatDateTime(s.startedAt) },
                {
                  key: 'completed',
                  header: 'Completed',
                  render: (s) => s.completedAt ? formatDateTime(s.completedAt) : '—',
                },
                {
                  key: 'disc',
                  header: 'Discrepancies',
                  render: (s) =>
                    s.status !== 'completed' ? '—' : s.discrepancyCount === 0 ? (
                      <span className="text-emerald-600">None</span>
                    ) : (
                      <span className="text-amber-600">{s.discrepancyCount}</span>
                    ),
                },
                { key: 'by', header: 'Performed By', render: (s) => s.performedBy || '—' },
                {
                  key: 'actions',
                  header: '',
                  render: (s) =>
                    s.status === 'in_progress' || s.status === 'draft' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancel(s)
                        }}
                        disabled={cancellingId === s.id}
                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {cancellingId === s.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    ) : null,
                },
              ]}
            />
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-5 w-5 text-gold-500" />
          <p className="text-sm text-vault-600">
            Start a new audit from any vault&apos;s detail page — pick Standard or Advanced on the start screen.
            In-progress audits can be continued from the vault audit widget or this list.
          </p>
        </div>
      </Card>
    </div>
  )
}