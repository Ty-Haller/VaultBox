import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Calendar, ClipboardCheck, Clock } from 'lucide-react'
import { useAdmin } from '../../context/AdminContext'
import { api } from '../../lib/api'
import {
  activeAuditForVault,
  AUDIT_TYPE_LABELS,
  computeVaultAuditSchedule,
  latestCompletedAudit,
  resolveVaultAuditWorkflow,
} from '../../lib/auditWorkflow'
import type { AuditSession } from '../../types'
import type { Vault } from '../../types'
import { formatDate } from '../../lib/utils'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'

interface VaultAuditWidgetProps {
  vault: Vault
}

const STATUS_LABELS = {
  overdue: { label: 'Overdue', variant: 'warning' as const },
  due_soon: { label: 'Due soon', variant: 'info' as const },
  on_track: { label: 'On track', variant: 'success' as const },
  never_audited: { label: 'Never audited', variant: 'warning' as const },
  no_schedule: { label: 'No schedule', variant: 'default' as const },
}

export function VaultAuditWidget({ vault }: VaultAuditWidgetProps) {
  const { auditWorkflows } = useAdmin()
  const [sessions, setSessions] = useState<AuditSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAudits(vault.id)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [vault.id])

  const workflow = resolveVaultAuditWorkflow(auditWorkflows)
  const schedule = useMemo(
    () => computeVaultAuditSchedule(vault.lastAuditDate, workflow),
    [vault.lastAuditDate, workflow]
  )
  const inProgress = activeAuditForVault(sessions)
  const lastCompleted = latestCompletedAudit(sessions)
  const statusMeta = STATUS_LABELS[schedule.status]

  return (
    <Card>
      <CardHeader
        title="Audit Status"
        subtitle={schedule.workflowName ? `${schedule.workflowName} · every ${schedule.intervalDays} days` : 'Configure workflows in Admin → Audit Workflows'}
      />
      {loading ? (
        <p className="text-sm text-vault-500">Loading audit status…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            {schedule.nextDueDate && schedule.status !== 'no_schedule' && (
              <span className="text-sm text-vault-600">
                {schedule.status === 'overdue' ? (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Due {formatDate(schedule.nextDueDate.toISOString().split('T')[0])}
                  </span>
                ) : schedule.daysUntilDue != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-vault-400" />
                    Next due {formatDate(schedule.nextDueDate.toISOString().split('T')[0])}
                    {schedule.daysUntilDue > 0 && (
                      <span className="text-vault-400">({schedule.daysUntilDue} days)</span>
                    )}
                  </span>
                ) : null}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-vault-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-vault-400">Last completed</p>
              <p className="mt-0.5 font-medium text-vault-800">
                {vault.lastAuditDate
                  ? formatDate(vault.lastAuditDate)
                  : lastCompleted?.completedAt
                    ? formatDate(lastCompleted.completedAt.split('T')[0])
                    : '—'}
              </p>
            </div>
            {inProgress ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-amber-700">In progress</p>
                <p className="mt-0.5 font-medium text-amber-900">
                  {AUDIT_TYPE_LABELS[inProgress.auditType ?? 'standard']}
                  <span className="ml-1 font-normal text-amber-700">
                    · started {formatDate(inProgress.startedAt.split('T')[0])}
                  </span>
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-vault-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-vault-400">In progress</p>
                <p className="mt-0.5 font-medium text-vault-600">None</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-vault-100 pt-3">
            {inProgress && (
              <Link
                to={`/vaults/${vault.id}/audit/${inProgress.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-vault-300 bg-white px-3 py-1.5 text-sm font-medium text-vault-700 hover:bg-vault-50"
              >
                <Clock className="h-4 w-4" />
                Continue audit
              </Link>
            )}
            <Link
              to={`/vaults/${vault.id}/audit`}
              className="inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gold-400"
            >
              <ClipboardCheck className="h-4 w-4" />
              {inProgress ? 'Start new audit' : 'Start audit'}
            </Link>
          </div>
        </div>
      )}
    </Card>
  )
}