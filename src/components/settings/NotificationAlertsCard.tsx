import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Plus, Send } from 'lucide-react'
import { authApi, type NotificationTestResult } from '../../lib/authApi'
import { useAuth } from '../../context/AuthContext'
import type { NotificationPreferenceEvent } from '../../types/notifications'
import { AppriseUrlBuilderModal } from './AppriseUrlBuilderModal'
import { Card, CardHeader } from '../ui/Card'
import { FormField, inputClass } from '../ui/FormField'

type PrefDraft = {
  enabled: boolean
  inApp: boolean
  email: boolean
  apprise: boolean
}

const ALERT_SECTIONS: {
  id: string
  title: string
  configNote?: string
  eventTypes: string[]
}[] = [
  {
    id: 'market',
    title: 'Market Alerts',
    configNote: 'Configure % change and price above/below thresholds on each instrument under Live Prices.',
    eventTypes: ['price_change'],
  },
  {
    id: 'vault',
    title: 'Vault Alerts',
    configNote: 'Configure audit schedule, refire interval, and capacity threshold on each vault.',
    eventTypes: ['audit_due', 'audit_overdue', 'capacity_warning'],
  },
  {
    id: 'holding',
    title: 'Holding Value Alerts',
    configNote: 'Configure gain/loss % thresholds on each holding.',
    eventTypes: ['asset_value_gain', 'asset_value_loss'],
  },
  {
    id: 'audit-events',
    title: 'Audit Activity',
    eventTypes: ['audit_completed', 'audit_completed_issues', 'audit_canceled'],
  },
  {
    id: 'admin',
    title: 'Admin & Users',
    eventTypes: ['signup_request', 'user_created', 'user_deleted', 'passkey_added', 'passkey_removed'],
  },
  {
    id: 'asset',
    title: 'Asset Events',
    eventTypes: ['new_acquisition', 'insurance_expiry'],
  },
  {
    id: 'activity',
    title: 'Activity Log',
    eventTypes: ['activity_create', 'activity_update', 'activity_delete', 'activity_transact'],
  },
]

function toDraft(event: NotificationPreferenceEvent): PrefDraft {
  return {
    enabled: event.enabled,
    inApp: event.inApp,
    email: event.email,
    apprise: event.apprise,
  }
}

function EventRow({
  event,
  draft,
  onChange,
}: {
  event: NotificationPreferenceEvent
  draft: PrefDraft
  onChange: (patch: Partial<PrefDraft>) => void
}) {
  return (
    <div className="rounded-lg border border-vault-100 p-3 dark:border-vault-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-vault-900 dark:text-white">{event.name}</p>
          {event.description && (
            <p className="text-xs text-vault-500 dark:text-vault-400">{event.description}</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-vault-700 dark:text-vault-300">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>
      {draft.enabled && (
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-vault-600 dark:text-vault-400">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={draft.inApp} onChange={(e) => onChange({ inApp: e.target.checked })} />
            In-app
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={draft.email} onChange={(e) => onChange({ email: e.target.checked })} />
            Email
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={draft.apprise} onChange={(e) => onChange({ apprise: e.target.checked })} />
            Apprise
          </label>
        </div>
      )}
    </div>
  )
}

export function NotificationAlertsCard() {
  const { user } = useAuth()
  const [events, setEvents] = useState<NotificationPreferenceEvent[]>([])
  const [drafts, setDrafts] = useState<Record<string, PrefDraft>>({})
  const [appriseUrls, setAppriseUrls] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [appriseBuilderOpen, setAppriseBuilderOpen] = useState(false)
  const [testingNotifications, setTestingNotifications] = useState(false)
  const [testChannels, setTestChannels] = useState({
    inApp: true,
    email: true,
    apprise: true,
  })
  const [testResult, setTestResult] = useState<NotificationTestResult | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.getNotificationPreferences()
      const unique = new Map<string, NotificationPreferenceEvent>()
      for (const e of data.events) unique.set(e.eventType, e)
      const list = [...unique.values()]
      setEvents(list)
      const next: Record<string, PrefDraft> = {}
      for (const e of list) next[e.eventType] = toDraft(e)
      setDrafts(next)
      setAppriseUrls((data.appriseUrls ?? []).join('\n'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alert preferences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const eventsByType = useMemo(() => {
    const map = new Map<string, NotificationPreferenceEvent>()
    for (const e of events) map.set(e.eventType, e)
    return map
  }, [events])

  const sections = useMemo(() => {
    const assigned = new Set<string>()
    const result: { section: typeof ALERT_SECTIONS[number]; items: NotificationPreferenceEvent[] }[] = []
    for (const section of ALERT_SECTIONS) {
      const items = section.eventTypes
        .map((t) => eventsByType.get(t))
        .filter((e): e is NotificationPreferenceEvent => Boolean(e))
      items.forEach((e) => assigned.add(e.eventType))
      if (items.length > 0) result.push({ section, items })
    }
    const other = events.filter((e) => !assigned.has(e.eventType))
    if (other.length > 0) {
      result.push({
        section: { id: 'other', title: 'Other', eventTypes: other.map((e) => e.eventType) },
        items: other,
      })
    }
    return result
  }, [events, eventsByType])

  const updateDraft = (eventType: string, patch: Partial<PrefDraft>) => {
    setDrafts((prev) => ({ ...prev, [eventType]: { ...prev[eventType], ...patch } }))
    setSaved(false)
  }

  const appriseUrlList = useMemo(
    () => appriseUrls.split('\n').map((u) => u.trim()).filter(Boolean),
    [appriseUrls]
  )

  const runNotificationTest = async () => {
    const channels = (['inApp', 'email', 'apprise'] as const).filter((ch) => testChannels[ch])
    if (channels.length === 0) return
    setTestingNotifications(true)
    setTestResult(null)
    try {
      const result = await authApi.testNotifications({
        channels: [...channels],
        appriseUrls: channels.includes('apprise') ? appriseUrlList : undefined,
      })
      setTestResult(result)
    } catch (e) {
      setTestResult({
        sent: false,
        inApp: { skipped: true, ok: false, error: e instanceof Error ? e.message : 'Test failed' },
        email: { skipped: true, ok: false, error: null },
        apprise: { skipped: true, ok: false, error: null },
      })
    } finally {
      setTestingNotifications(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const preferences = events.map((e) => {
        const d = drafts[e.eventType]
        const orig = toDraft(e)
        const item: {
          eventType: string
          enabled?: boolean
          inApp?: boolean
          email?: boolean
          apprise?: boolean
        } = { eventType: e.eventType }
        if (d.enabled !== orig.enabled) item.enabled = d.enabled
        if (d.inApp !== orig.inApp) item.inApp = d.inApp
        if (d.email !== orig.email) item.email = d.email
        if (d.apprise !== orig.apprise) item.apprise = d.apprise
        return item
      }).filter((item) => Object.keys(item).length > 1)

      const urls = appriseUrls.split('\n').map((u) => u.trim()).filter(Boolean)
      await authApi.updateNotificationPreferences({ preferences, appriseUrls: urls })
      await load()
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Notification Preferences" />
      <p className="mb-4 text-sm text-vault-500 dark:text-vault-400">
        Choose which alerts you receive and how they are delivered. Thresholds for market, vault, and holding alerts
        are configured on those entities (or in Admin for market).
      </p>

      {user?.email ? (
        <p className="mb-4 text-sm text-vault-600 dark:text-vault-400">
          Email delivery: <span className="font-medium text-vault-900 dark:text-white">{user.email}</span>
        </p>
      ) : (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Add an email address above to receive email alerts.
        </p>
      )}

      <div className="mb-6 rounded-lg border border-vault-200 bg-vault-50/80 p-4 dark:border-vault-700 dark:bg-vault-800/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-vault-900 dark:text-white">Test notifications</p>
            <p className="mt-0.5 text-xs text-vault-500 dark:text-vault-400">
              Send a test through the channels below using your current settings (saved or not).
            </p>
          </div>
          <button
            type="button"
            disabled={
              testingNotifications
              || (!testChannels.inApp && !testChannels.email && !testChannels.apprise)
            }
            onClick={runNotificationTest}
            className="inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {testingNotifications ? 'Sending…' : 'Send test'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-vault-700 dark:text-vault-300">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={testChannels.inApp}
              onChange={(e) => setTestChannels((c) => ({ ...c, inApp: e.target.checked }))}
            />
            In-app
          </label>
          <label className={`flex items-center gap-1.5 ${!user?.email ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              checked={testChannels.email}
              disabled={!user?.email}
              onChange={(e) => setTestChannels((c) => ({ ...c, email: e.target.checked }))}
            />
            Email
          </label>
          <label className={`flex items-center gap-1.5 ${appriseUrlList.length === 0 ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              checked={testChannels.apprise}
              disabled={appriseUrlList.length === 0}
              onChange={(e) => setTestChannels((c) => ({ ...c, apprise: e.target.checked }))}
            />
            Apprise
          </label>
        </div>
        {testResult && (
          <ul className="mt-3 space-y-1 text-xs">
            {(['inApp', 'email', 'apprise'] as const).map((ch) => {
              const r = testResult[ch]
              if (r.skipped) return null
              const label = ch === 'inApp' ? 'In-app' : ch === 'email' ? 'Email' : 'Apprise'
              const text = r.ok
                ? (r.detail ?? 'OK')
                : (r.error ?? 'Failed')
              return (
                <li
                  key={ch}
                  className={r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
                >
                  <span className="font-medium">{label}:</span> {text}
                  {ch === 'apprise' && r.results?.some((x) => !x.ok) && (
                    <span className="block pl-4 text-vault-500 dark:text-vault-400">
                      {r.results.filter((x) => !x.ok).map((x) => `${x.url}${x.error ? ` — ${x.error}` : ''}`).join('; ')}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-vault-500">Loading preferences…</p>
      ) : (
        <>
          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
          )}
          {saved && (
            <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Preferences saved.
            </p>
          )}

          <div className="space-y-6">
            {sections.map(({ section, items }) => (
              <div key={section.id}>
                <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-vault-800 dark:text-vault-200">
                  <Bell className="h-4 w-4 text-gold-500" />
                  {section.title}
                </h4>
                {section.configNote && (
                  <p className="mb-2 text-xs text-vault-500 dark:text-vault-400">{section.configNote}</p>
                )}
                <div className="space-y-3">
                  {items.map((e) => {
                    const d = drafts[e.eventType]
                    if (!d) return null
                    return (
                      <EventRow
                        key={e.eventType}
                        event={e}
                        draft={d}
                        onChange={(patch) => updateDraft(e.eventType, patch)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}

            <FormField label="Apprise URLs (one per line)">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-vault-500 dark:text-vault-400">
                  Optional external notification endpoints (Discord, Slack, Telegram, Pushover, etc.)
                </p>
                <button
                  type="button"
                  onClick={() => setAppriseBuilderOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-vault-200 bg-white px-2.5 py-1 text-xs font-medium text-vault-700 hover:bg-vault-50 dark:border-vault-600 dark:bg-vault-800 dark:text-vault-200 dark:hover:bg-vault-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add service
                </button>
              </div>
              <textarea
                className={`${inputClass} min-h-[80px] font-mono text-xs`}
                value={appriseUrls}
                onChange={(e) => {
                  setAppriseUrls(e.target.value)
                  setSaved(false)
                  setTestResult(null)
                }}
                placeholder="discord://WebhookID/WebhookToken"
              />
            </FormField>

            <AppriseUrlBuilderModal
              open={appriseBuilderOpen}
              onClose={() => setAppriseBuilderOpen(false)}
              onAdd={(url) => {
                const existing = appriseUrls
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                if (existing.includes(url)) return
                const next = existing.length > 0 ? [...existing, url].join('\n') : url
                setAppriseUrls(next)
                setSaved(false)
              }}
            />

            <button
              type="button"
              onClick={save}
              disabled={saving || events.length === 0}
              className="rounded-md bg-vault-800 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700 disabled:opacity-50 dark:bg-vault-600"
            >
              {saving ? 'Saving…' : 'Save notification preferences'}
            </button>
          </div>
        </>
      )}
    </Card>
  )
}