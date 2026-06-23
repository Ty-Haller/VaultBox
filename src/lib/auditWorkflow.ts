import type { AdminAuditWorkflow } from '../types/admin'
import type { AuditSession, AuditType } from '../types'

export function resolveVaultAuditWorkflow(
  workflows: AdminAuditWorkflow[]
): AdminAuditWorkflow | undefined {
  return workflows.find(
    (w) => w.enabled && (w.appliesTo === 'vault' || w.appliesTo === 'all')
  )
}

export function resolveVaultAuditType(workflows: AdminAuditWorkflow[]): AuditType {
  return resolveVaultAuditWorkflow(workflows)?.auditType ?? 'standard'
}

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  standard: 'Standard',
  advanced: 'Advanced',
}

export const AUDIT_TYPE_DESCRIPTIONS: Record<AuditType, string> = {
  standard: 'Total counts grouped by product type',
  advanced: 'Each asset verified individually by ID / QR code',
}

export type AuditScheduleStatus = 'overdue' | 'due_soon' | 'on_track' | 'never_audited' | 'no_schedule'

export interface VaultAuditSchedule {
  workflowName: string | null
  intervalDays: number | null
  reminderDaysBefore: number | null
  lastAuditDate: string | null
  nextDueDate: Date | null
  daysUntilDue: number | null
  status: AuditScheduleStatus
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function computeVaultAuditSchedule(
  lastAuditDate: string | undefined | null,
  workflow: AdminAuditWorkflow | undefined
): VaultAuditSchedule {
  const empty: VaultAuditSchedule = {
    workflowName: workflow?.name ?? null,
    intervalDays: workflow?.intervalDays ?? null,
    reminderDaysBefore: workflow?.reminderDaysBefore ?? null,
    lastAuditDate: lastAuditDate ?? null,
    nextDueDate: null,
    daysUntilDue: null,
    status: workflow ? 'never_audited' : 'no_schedule',
  }
  if (!workflow?.enabled) {
    return { ...empty, status: 'no_schedule' }
  }
  const today = startOfDay(new Date())
  if (!lastAuditDate) {
    return {
      ...empty,
      nextDueDate: today,
      daysUntilDue: 0,
      status: 'overdue',
    }
  }
  const last = startOfDay(new Date(lastAuditDate))
  const nextDue = new Date(last)
  nextDue.setDate(nextDue.getDate() + workflow.intervalDays)
  const nextDueDay = startOfDay(nextDue)
  const daysUntilDue = Math.round((nextDueDay.getTime() - today.getTime()) / 86400000)
  let status: AuditScheduleStatus = 'on_track'
  if (daysUntilDue < 0) status = 'overdue'
  else if (daysUntilDue <= workflow.reminderDaysBefore) status = 'due_soon'
  return {
    workflowName: workflow.name,
    intervalDays: workflow.intervalDays,
    reminderDaysBefore: workflow.reminderDaysBefore,
    lastAuditDate,
    nextDueDate: nextDueDay,
    daysUntilDue,
    status,
  }
}

export function activeAuditForVault(sessions: AuditSession[]): AuditSession | undefined {
  return sessions.find((s) => s.status === 'in_progress' || s.status === 'draft')
}

export function latestCompletedAudit(sessions: AuditSession[]): AuditSession | undefined {
  return sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.completedAt ?? b.startedAt).getTime() - new Date(a.completedAt ?? a.startedAt).getTime())[0]
}