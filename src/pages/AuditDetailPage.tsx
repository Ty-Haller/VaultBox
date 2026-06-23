import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Shield } from 'lucide-react'
import { api } from '../lib/api'
import type { AuditReport, AuditSession } from '../types'
import { AUDIT_TYPE_LABELS } from '../lib/auditWorkflow'
import { formatDate, formatDateTime } from '../lib/utils'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'

export function AuditDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<AuditSession | null>(null)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getAudit(id),
      api.getAuditReports().then((reports) => reports.find((r) => r.auditId === id) ?? null),
    ])
      .then(([s, r]) => {
        if (s.status === 'in_progress' || s.status === 'draft') {
          navigate(`/vaults/${s.vaultId}/audit/${s.id}`, { replace: true })
          return
        }
        setSession(s)
        setReport(r)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load audit'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return <p className="text-sm text-vault-500">Loading audit report…</p>
  }

  if (error || !session) {
    return (
      <div className="space-y-3">
        <p className="text-red-600">{error ?? 'Audit not found'}</p>
        <Link to="/audits" className="text-gold-500 hover:underline">Back to audits</Link>
      </div>
    )
  }

  const lineItems = session.lineItems ?? []
  const reportData = report?.reportData as {
    discrepancyCount?: number
    performedBy?: string
    notes?: string
  } | undefined

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <Link to="/audits" className="mt-1 rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-vault-900">Audit Report</h2>
            <Badge variant="success">{session.status.replace('_', ' ')}</Badge>
          </div>
          <p className="mt-1 text-sm text-vault-500">
            {session.vaultName}
            {' · '}{AUDIT_TYPE_LABELS[session.auditType ?? 'standard']} audit
            {session.completedAt && <> · completed {formatDateTime(session.completedAt)}</>}
          </p>
        </div>
        <Link
          to={`/vaults/${session.vaultId}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-vault-200 px-3 py-1.5 text-sm text-vault-600 hover:bg-vault-50"
        >
          <Shield className="h-4 w-4" />
          View Vault
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-vault-400">Started</p>
          <p className="mt-1 text-sm font-medium">{formatDateTime(session.startedAt)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-vault-400">Performed By</p>
          <p className="mt-1 text-sm font-medium">{session.performedBy || reportData?.performedBy || '—'}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-vault-400">Items Checked</p>
          <p className="mt-1 text-sm font-medium">{lineItems.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-vault-400">Discrepancies</p>
          <p className={`mt-1 text-sm font-medium ${session.discrepancyCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {session.discrepancyCount}
          </p>
        </Card>
      </div>

      {(session.notes || reportData?.notes) && (
        <Card>
          <CardHeader title="Notes" />
          <p className="text-sm text-vault-700">{session.notes || reportData?.notes}</p>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Line Items"
          subtitle={
            session.auditType === 'advanced'
              ? 'Per-asset counts vs expected quantities'
              : 'Product type totals vs expected quantities'
          }
        />
        <DataTable
          keyField="id"
          data={lineItems}
          columns={[
            ...(session.auditType === 'advanced'
              ? [{
                  key: 'qr',
                  header: 'QR / ID',
                  render: (l: typeof lineItems[0]) => (
                    <span className="font-mono text-xs">{l.holdingQrCode ?? l.holdingId?.slice(0, 8) ?? '—'}</span>
                  ),
                }]
              : []),
            {
              key: 'name',
              header: session.auditType === 'advanced' ? 'Asset' : 'Product Type',
              render: (l) => l.holdingName,
            },
            { key: 'expected', header: 'Expected', render: (l) => <span className="font-mono">{l.expectedQty}</span> },
            {
              key: 'counted',
              header: 'Counted',
              render: (l) => (
                <span className={`font-mono ${l.countedQty !== l.expectedQty ? 'text-amber-600' : ''}`}>
                  {l.countedQty ?? '—'}
                </span>
              ),
            },
            {
              key: 'match',
              header: 'Match',
              render: (l) =>
                l.countedQty === null ? '—' : l.countedQty === l.expectedQty ? (
                  <span className="text-emerald-600">✓</span>
                ) : (
                  <span className="text-amber-600">≠</span>
                ),
            },
            {
              key: 'notes',
              header: 'Notes',
              render: (l) => l.discrepancyNotes || '—',
            },
          ]}
        />
      </Card>

      <div className="flex items-center gap-2 text-xs text-vault-400">
        <ClipboardCheck className="h-4 w-4" />
        Report saved {report ? formatDate(report.createdAt.split('T')[0]) : formatDate(session.completedAt?.split('T')[0] ?? '')}
      </div>
    </div>
  )
}