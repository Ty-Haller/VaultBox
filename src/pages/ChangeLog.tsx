import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import type { ChangeLogEntry } from '../types'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { Badge } from '../components/ui/Badge'

const ACTION_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  transact: 'warning',
}

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  holding: (id) => `/inventory/${id}`,
  vault: (id) => `/vaults/${id}`,
  site: (id) => `/sites/${id}`,
  secret: () => '/secrets',
  audit: () => '/audits',
}

export function ChangeLog() {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getChangeLog()
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load change log'))
      .finally(() => setLoading(false))
  }, [])

  const entityTypes = useMemo(
    () => [...new Set(entries.map((e) => e.entityType))].sort(),
    [entries]
  )

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (entityFilter !== 'all' && e.entityType !== entityFilter) return false
      if (actionFilter !== 'all' && e.action !== actionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          e.entityLabel.toLowerCase().includes(q) ||
          e.performedBy.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q) ||
          e.entityType.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [entries, entityFilter, actionFilter, search])

  const summarizeChanges = (entry: ChangeLogEntry) => {
    const changes = entry.changes ?? {}
    if (entry.action === 'transact' && typeof changes.transactionType === 'string') {
      return `Archived as ${changes.transactionType}`
    }
    if (entry.action === 'create') return 'Record created'
    if (entry.action === 'delete') return 'Record deleted'
    if (entry.action === 'update') {
      const before = changes.before as Record<string, unknown> | undefined
      const after = changes.after as Record<string, unknown> | undefined
      if (!before || !after) return 'Record updated'
      const keys = Object.keys(after).filter((k) => before[k] !== after[k])
      if (keys.length === 0) return 'Record updated'
      return `Updated: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`
    }
    return entry.notes || '—'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-gold-500" />
        <div>
          <h2 className="text-xl font-bold text-vault-900">Activity Log</h2>
          <p className="text-sm text-vault-500">System-wide audit trail of creates, updates, and transactions</p>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search label, user, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[200px] flex-1 rounded-md border border-vault-200 px-3 py-1.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-md border border-vault-200 px-3 py-1.5 text-sm"
          >
            <option value="all">All Entities</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-md border border-vault-200 px-3 py-1.5 text-sm"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="transact">Transact</option>
            <option value="delete">Delete</option>
          </select>
          <span className="text-sm text-vault-500">{filtered.length} entries</span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-vault-500">Loading activity log…</p>
        ) : (
          <DataTable
            keyField="id"
            data={filtered}
            exportFilename="vaultbox-activity-log"
            columns={[
              {
                key: 'time',
                header: 'When',
                render: (e) => (
                  <span className="whitespace-nowrap text-xs text-vault-600">
                    {formatDateTime(e.createdAt)}
                  </span>
                ),
                getCsvValue: (e) => formatDateTime(e.createdAt),
              },
              {
                key: 'action',
                header: 'Action',
                render: (e) => (
                  <Badge variant={ACTION_VARIANTS[e.action] ?? 'default'}>
                    {e.action}
                  </Badge>
                ),
                getCsvValue: (e) => e.action,
              },
              {
                key: 'entity',
                header: 'Entity',
                render: (e) => (
                  <div>
                    <span className="text-xs uppercase text-vault-400">{e.entityType}</span>
                    {ENTITY_LINKS[e.entityType] ? (
                      <Link
                        to={ENTITY_LINKS[e.entityType](e.entityId)}
                        className="block font-medium text-gold-500 hover:underline"
                      >
                        {e.entityLabel}
                      </Link>
                    ) : (
                      <span className="block font-medium text-vault-800">{e.entityLabel}</span>
                    )}
                  </div>
                ),
                getCsvValue: (e) => `${e.entityType}: ${e.entityLabel}`,
              },
              {
                key: 'summary',
                header: 'Summary',
                render: (e) => (
                  <span className="text-sm text-vault-600">{summarizeChanges(e)}</span>
                ),
                getCsvValue: (e) => summarizeChanges(e),
              },
              {
                key: 'user',
                header: 'By',
                render: (e) => e.performedBy || '—',
                getCsvValue: (e) => e.performedBy || '',
              },
            ]}
          />
        )}
      </Card>
    </div>
  )
}