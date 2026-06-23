import { useCallback, useEffect, useState } from 'react'
import { Bell, Save } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import type { MarketAlertConfig } from '../../types/notifications'
import type { TickerItemType } from '../../lib/tickerConfig'
import { Card, CardHeader } from '../ui/Card'
import { FormField, inputClass } from '../ui/FormField'

const DEFAULT_CONFIG: MarketAlertConfig = {
  percentChangeThreshold: 1,
  priceAbove: null,
  priceBelow: null,
}

interface MarketAlertCardProps {
  type: TickerItemType
  symbol: string
  label: string
  forex?: boolean
}

export function MarketAlertCard({ type, symbol, label, forex }: MarketAlertCardProps) {
  const { user } = useAuth()
  const canEdit = user?.permissions.canEditMarketAlerts ?? false

  const [config, setConfig] = useState<MarketAlertConfig>(DEFAULT_CONFIG)
  const [draft, setDraft] = useState<MarketAlertConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getMarketAlert(type, symbol)
      const next = {
        percentChangeThreshold: data.percentChangeThreshold,
        priceAbove: data.priceAbove,
        priceBelow: data.priceBelow,
      }
      setConfig(next)
      setDraft(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alert settings')
    } finally {
      setLoading(false)
    }
  }, [type, symbol])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const saved = await api.updateMarketAlert(type, symbol, {
        percentChangeThreshold: draft.percentChangeThreshold,
        priceAbove: draft.priceAbove,
        priceBelow: draft.priceBelow,
      })
      const next = {
        percentChangeThreshold: saved.percentChangeThreshold,
        priceAbove: saved.priceAbove,
        priceBelow: saved.priceBelow,
      }
      setConfig(next)
      setDraft(next)
      setMessage('Market alert thresholds saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const priceUnit = forex ? '' : ' ($)'

  return (
    <Card>
      <CardHeader
        title="Market Alerts"
        subtitle={`Thresholds for ${label}. Enable delivery in User Settings → Notification Preferences.`}
      />
      {loading ? (
        <p className="text-sm text-vault-500 dark:text-vault-400">Loading alert settings…</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : canEdit ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="% change threshold">
              <input
                type="number"
                step="0.1"
                min={0}
                className={inputClass}
                value={draft.percentChangeThreshold}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    percentChangeThreshold: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </FormField>
            <FormField label={`Price above${priceUnit}`}>
              <input
                type="number"
                step={forex ? '0.0001' : '0.01'}
                className={inputClass}
                value={draft.priceAbove ?? ''}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    priceAbove: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Optional"
              />
            </FormField>
            <FormField label={`Price below${priceUnit}`}>
              <input
                type="number"
                step={forex ? '0.0001' : '0.01'}
                className={inputClass}
                value={draft.priceBelow ?? ''}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    priceBelow: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Optional"
              />
            </FormField>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="ml-auto inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Alerts'}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-vault-500">% change</p>
              <p className="mt-1 text-sm font-semibold text-vault-900 dark:text-white">
                {config.percentChangeThreshold}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-vault-500">Price above</p>
              <p className="mt-1 text-sm font-semibold text-vault-900 dark:text-white">
                {config.priceAbove != null ? config.priceAbove : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-vault-500">Price below</p>
              <p className="mt-1 text-sm font-semibold text-vault-900 dark:text-white">
                {config.priceBelow != null ? config.priceBelow : '—'}
              </p>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-vault-500">
            <Bell className="h-3.5 w-3.5" />
            View only — contact an administrator to edit market alert thresholds.
          </p>
        </div>
      )}
    </Card>
  )
}