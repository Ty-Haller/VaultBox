import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Shield, TrendingUp, AlertTriangle, X, Trash2, Settings } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import type { InboxNotification } from '../../types/notifications'

function iconFor(eventType: string, severity: string) {
  if (eventType.startsWith('audit')) {
    return <Shield className={`h-4 w-4 ${severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
  }
  if (eventType === 'price_change' || eventType.startsWith('asset_value')) {
    return <TrendingUp className="h-4 w-4 text-emerald-500" />
  }
  if (severity === 'critical' || severity === 'warning') {
    return <AlertTriangle className={`h-4 w-4 ${severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
  }
  return <Bell className="h-4 w-4 text-vault-400" />
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<InboxNotification[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (evaluate = false) => {
    setLoading(true)
    try {
      if (evaluate) {
        await api.evaluateNotifications().catch(() => undefined)
      }
      const items = await api.getNotifications()
      setNotifications(items)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (open) load(true)
  }, [open, load])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const dismiss = async (id: string) => {
    await api.dismissNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = async () => {
    await api.clearNotifications()
    setNotifications([])
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-vault-500 hover:bg-vault-100 dark:text-vault-400 dark:hover:bg-vault-800"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[150] mt-2 w-80 rounded-lg border border-vault-200 bg-white shadow-xl dark:border-vault-700 dark:bg-vault-900">
          <div className="flex items-center justify-between border-b border-vault-100 px-4 py-3 dark:border-vault-700">
            <h3 className="text-sm font-semibold text-vault-900 dark:text-vault-100">Notifications</h3>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded p-1 text-vault-400 hover:bg-vault-100 hover:text-vault-600 dark:hover:bg-vault-800"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-vault-400 hover:bg-vault-100 hover:text-vault-600 dark:hover:bg-vault-800"
                title="Alert settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-vault-400 hover:text-vault-600 dark:hover:text-vault-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading && notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-vault-500">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-vault-500">No notifications</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="group border-b border-vault-50 last:border-0 dark:border-vault-800">
                  <div className="flex gap-2 px-4 py-3 hover:bg-vault-50 dark:hover:bg-vault-800">
                    <div className="mt-0.5 shrink-0">{iconFor(n.eventType, n.severity)}</div>
                    <div className="min-w-0 flex-1">
                      {n.link ? (
                        <Link
                          to={n.link}
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          <p className="text-sm font-medium text-vault-800 dark:text-vault-200">{n.title}</p>
                          <p className="text-xs text-vault-500 dark:text-vault-400">{n.message}</p>
                        </Link>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-vault-800 dark:text-vault-200">{n.title}</p>
                          <p className="text-xs text-vault-500 dark:text-vault-400">{n.message}</p>
                        </>
                      )}
                      <p className="mt-1 text-[10px] text-vault-400">{formatDateTime(n.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(n.id)}
                      className="shrink-0 self-start rounded p-1 text-vault-300 opacity-0 transition-opacity hover:text-vault-600 group-hover:opacity-100 dark:hover:text-vault-200"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}