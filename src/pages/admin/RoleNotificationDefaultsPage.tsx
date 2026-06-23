import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import type { AdminNotificationCatalogItem, RoleNotificationDefault } from '../../types/notifications'
import { Card } from '../../components/ui/Card'

const ROLES = [
  { id: 'full_admin', label: 'Full Admin' },
  { id: 'site_admin', label: 'Site Admin' },
  { id: 'vault_admin', label: 'Vault Admin' },
  { id: 'viewer', label: 'Viewer' },
  { id: 'audit_reporting', label: 'Audit / Reporting' },
] as const

export function RoleNotificationDefaultsPage() {
  const [catalog, setCatalog] = useState<AdminNotificationCatalogItem[]>([])
  const [defaults, setDefaults] = useState<RoleNotificationDefault[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('full_admin')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cat, defs] = await Promise.all([
        adminApi.getNotificationCatalog(),
        adminApi.listRoleNotificationDefaults(),
      ])
      setCatalog(cat)
      setDefaults(defs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load role defaults')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const catalogByEvent = useMemo(() => {
    const map = new Map<string, AdminNotificationCatalogItem>()
    for (const c of catalog) map.set(c.eventType, c)
    return map
  }, [catalog])

  const roleRows = useMemo(
    () => defaults.filter((d) => d.role === selectedRole).sort((a, b) => {
      const ca = catalogByEvent.get(a.eventType)?.category ?? ''
      const cb = catalogByEvent.get(b.eventType)?.category ?? ''
      return ca.localeCompare(cb) || a.eventType.localeCompare(b.eventType)
    }),
    [defaults, selectedRole, catalogByEvent],
  )

  const toggle = async (row: RoleNotificationDefault, field: 'enabled' | 'inApp' | 'email', value: boolean) => {
    setSaving(row.id)
    try {
      const patch: Partial<RoleNotificationDefault> = {}
      if (field === 'enabled') patch.enabled = value
      if (field === 'inApp') patch.inApp = value
      if (field === 'email') patch.email = value
      const updated = await adminApi.updateRoleNotificationDefault(row.id, patch)
      setDefaults((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/notifications" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Role Notification Defaults</h2>
          <p className="text-sm text-vault-500">Per-role default subscriptions (hybrid permission baseline)</p>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedRole(r.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              selectedRole === r.id
                ? 'bg-vault-800 text-white'
                : 'border border-vault-200 text-vault-700 hover:bg-vault-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-vault-500">Loading…</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-vault-100 text-left text-xs uppercase text-vault-500">
                  <th className="py-2 pr-4">Event</th>
                  <th className="px-2 py-2">Enabled</th>
                  <th className="px-2 py-2">In-app</th>
                  <th className="px-2 py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map((row) => {
                  const meta = catalogByEvent.get(row.eventType)
                  return (
                    <tr key={row.id} className="border-b border-vault-50 last:border-0">
                      <td className="py-2 pr-4">
                        <p className="font-medium text-vault-900">{meta?.name ?? row.eventType}</p>
                        <p className="text-xs text-vault-500">{meta?.category}</p>
                      </td>
                      {(['enabled', 'inApp', 'email'] as const).map((field) => {
                        const val = row[field]
                        const checked = val ?? (field === 'enabled' ? meta?.enabled : field === 'inApp' ? meta?.inAppNotify : meta?.emailNotify) ?? false
                        return (
                          <td key={field} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(checked)}
                              disabled={saving === row.id}
                              onChange={(e) => toggle(row, field, e.target.checked)}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {roleRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-vault-500">No defaults for this role</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}