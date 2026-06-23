import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import type { AdminNotificationCatalogItem, NotificationCategory } from '../../types/notifications'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  audit: 'Audits',
  admin: 'Admin & Users',
  market: 'Spot / Market',
  asset: 'Assets & Value',
  activity: 'Activity Log',
}

export function NotificationDefaultsPage() {
  const [catalog, setCatalog] = useState<AdminNotificationCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCatalog(await adminApi.getNotificationCatalog())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = useMemo(() => {
    const map = new Map<string, AdminNotificationCatalogItem[]>()
    for (const item of catalog) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return [...map.entries()]
  }, [catalog])

  const reset = async (kind: 'catalog' | 'all') => {
    if (!confirm(kind === 'all' ? 'Reset system catalog and role defaults?' : 'Reset system catalog to defaults?')) return
    setResetting(true)
    try {
      await adminApi.resetNotificationDefaults(kind)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-vault-900">Notification Defaults</h2>
            <p className="text-sm text-vault-500">System-wide event catalog and default channel settings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => reset('catalog')}
            disabled={resetting}
            className="flex items-center gap-2 rounded-md border border-vault-200 px-3 py-2 text-sm hover:bg-vault-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset catalog
          </button>
          <button
            type="button"
            onClick={() => reset('all')}
            disabled={resetting}
            className="flex items-center gap-2 rounded-md bg-vault-800 px-3 py-2 text-sm text-white hover:bg-vault-700 disabled:opacity-50"
          >
            Reset all defaults
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/admin/notification-roles" className="text-gold-600 hover:underline">Role defaults matrix →</Link>
        <Link to="/admin/notification-delivery" className="text-gold-600 hover:underline">SMTP delivery →</Link>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-vault-500">Loading…</p>
      ) : (
        grouped.map(([category, items]) => (
          <Card key={category}>
            <h3 className="mb-3 text-sm font-semibold text-vault-800">
              {CATEGORY_LABELS[category as NotificationCategory] ?? category}
            </h3>
            <div className="divide-y divide-vault-100">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-vault-900">{item.name}</p>
                    <p className="text-xs text-vault-500">{item.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={item.enabled ? 'success' : 'default'}>{item.enabled ? 'On' : 'Off'}</Badge>
                    {item.inAppNotify && <Badge variant="info">In-app</Badge>}
                    {item.emailNotify && <Badge variant="info">Email</Badge>}
                    {item.appriseNotify && <Badge variant="info">Apprise</Badge>}
                    {item.refireIntervalHours != null && (
                      <Badge variant="warning">Refire {item.refireIntervalHours}h</Badge>
                    )}
                    {item.threshold != null && (
                      <Badge variant="default">Threshold {item.threshold}%</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  )
}