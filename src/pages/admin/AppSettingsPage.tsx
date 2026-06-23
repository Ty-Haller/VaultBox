import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Save } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import { useAdmin } from '../../context/AdminContext'
import type { AdminAppSetting } from '../../types/admin'
import { Card } from '../../components/ui/Card'
import { FormField, inputClass, selectClass } from '../../components/ui/FormField'
import { Badge } from '../../components/ui/Badge'

const HIDDEN_KEYS = new Set(['price_ticker_config', 'ticker_scroll_mode'])

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  display: 'Display',
  integration: 'Integrations',
  security: 'Security',
  other: 'Other',
}

export function AppSettingsPage() {
  const { settings, refresh } = useAdmin()
  const [editing, setEditing] = useState<AdminAppSetting | null>(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const grouped = useMemo(() => {
    const visible = settings.filter((s) => !HIDDEN_KEYS.has(s.key))
    const map = new Map<string, AdminAppSetting[]>()
    for (const s of visible) {
      const cat = s.category || 'other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(s)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [settings])

  const openEdit = (s: AdminAppSetting) => {
    setEditing(s)
    setValue(s.value)
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await adminApi.update('settings', editing.id, { value })
      await refresh()
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Application Settings</h2>
          <p className="text-sm text-vault-500">
            Core configuration — price ticker has its own{' '}
            <Link to="/admin/price-ticker" className="text-gold-500 hover:underline">dedicated page</Link>
          </p>
        </div>
      </div>

      {grouped.map(([category, items]) => (
        <Card key={category}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-vault-500">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <ul className="mt-4 divide-y divide-vault-100">
            {items.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-vault-100 px-1.5 py-0.5 font-mono text-sm text-vault-800">{s.key}</code>
                    <Badge variant="info">{s.valueType}</Badge>
                  </div>
                  {s.description && <p className="mt-1 text-xs text-vault-500">{s.description}</p>}
                  <p className="mt-2 font-mono text-sm text-vault-700 break-all">
                    {s.valueType === 'boolean' ? (s.value === 'true' ? 'Enabled' : 'Disabled') : s.value || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="shrink-0 rounded-md p-2 text-vault-500 hover:bg-vault-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {editing && (
        <Card>
          <h3 className="font-semibold text-vault-900">Edit {editing.key}</h3>
          <p className="mt-1 text-xs text-vault-500">{editing.description}</p>
          <div className="mt-4 space-y-3">
            <FormField label="Value">
              {editing.valueType === 'boolean' ? (
                <select className={selectClass} value={value} onChange={(e) => setValue(e.target.value)}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : editing.value.length > 80 ? (
                <textarea className={inputClass} rows={4} value={value} onChange={(e) => setValue(e.target.value)} />
              ) : (
                <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} />
              )}
            </FormField>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-vault-200 px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}