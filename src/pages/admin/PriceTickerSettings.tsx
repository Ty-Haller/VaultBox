import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import { useAdmin } from '../../context/AdminContext'
import {
  DEFAULT_TICKER_CONFIG,
  parseTickerConfig,
  parseTickerScrollMode,
  type TickerConfigItem,
  type TickerItemType,
  type TickerScrollMode,
} from '../../lib/tickerConfig'
import { Card } from '../../components/ui/Card'

const SECTIONS: { type: TickerItemType; title: string; description: string }[] = [
  { type: 'metal', title: 'Precious Metals', description: 'Gold, silver, platinum, palladium spot (per troy oz)' },
  { type: 'crypto', title: 'Cryptocurrency', description: 'CoinGecko spot prices' },
  { type: 'stock', title: 'Stocks & ETFs', description: 'Market quotes for ETFs and indices' },
  { type: 'forex', title: 'Forex / USD', description: 'Currency pairs and USD reference' },
]

const AVAILABLE: Record<TickerItemType, { symbol: string; label: string }[]> = {
  metal: [
    { symbol: 'gold', label: 'Gold' },
    { symbol: 'silver', label: 'Silver' },
    { symbol: 'platinum', label: 'Platinum' },
    { symbol: 'palladium', label: 'Palladium' },
  ],
  crypto: [
    { symbol: 'BTC', label: 'Bitcoin' },
    { symbol: 'ETH', label: 'Ethereum' },
    { symbol: 'SOL', label: 'Solana' },
    { symbol: 'XRP', label: 'XRP' },
    { symbol: 'ADA', label: 'Cardano' },
    { symbol: 'LTC', label: 'Litecoin' },
  ],
  stock: [
    { symbol: 'GLD', label: 'GLD (Gold ETF)' },
    { symbol: 'SLV', label: 'SLV (Silver ETF)' },
    { symbol: 'SPY', label: 'SPY (S&P 500)' },
    { symbol: 'QQQ', label: 'QQQ (Nasdaq)' },
    { symbol: 'DIA', label: 'DIA (Dow)' },
    { symbol: 'IAU', label: 'IAU (Gold)' },
  ],
  forex: [
    { symbol: 'USD', label: 'USD' },
    { symbol: 'EUR', label: 'EUR/USD' },
    { symbol: 'GBP', label: 'GBP/USD' },
    { symbol: 'CAD', label: 'CAD/USD' },
    { symbol: 'JPY', label: 'JPY/USD' },
  ],
}

function mergeConfig(existing: TickerConfigItem[], cryptoOptions: { symbol: string; label: string }[]): TickerConfigItem[] {
  const map = new Map(existing.map((c) => [`${c.type}:${c.symbol}`, c]))
  const merged: TickerConfigItem[] = []
  for (const section of SECTIONS) {
    const opts = section.type === 'crypto'
      ? cryptoOptions
      : AVAILABLE[section.type]
    for (const opt of opts) {
      const key = `${section.type}:${opt.symbol}`
      const prev = map.get(key)
      merged.push({
        type: section.type,
        symbol: opt.symbol,
        label: opt.label,
        enabled: prev?.enabled ?? false,
      })
    }
  }
  return merged
}

export function PriceTickerSettings() {
  const { settings, refresh, activeCryptoTokens } = useAdmin()
  const [items, setItems] = useState<TickerConfigItem[]>(DEFAULT_TICKER_CONFIG)
  const [scrollMode, setScrollMode] = useState<TickerScrollMode>('auto')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const setting = settings.find((s) => s.key === 'price_ticker_config')
  const scrollSetting = settings.find((s) => s.key === 'ticker_scroll_mode')

  const cryptoOptions = activeCryptoTokens.length > 0
    ? activeCryptoTokens.map((t) => ({ symbol: t.symbol.toUpperCase(), label: t.name }))
    : AVAILABLE.crypto

  useEffect(() => {
    setItems(mergeConfig(parseTickerConfig(settings), cryptoOptions))
    setScrollMode(parseTickerScrollMode(settings))
  }, [settings, activeCryptoTokens])

  const toggle = (type: TickerItemType, symbol: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.type === type && i.symbol === symbol ? { ...i, enabled: !i.enabled } : i
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const payload = { value: JSON.stringify(items), valueType: 'json' as const }
      if (setting) {
        await adminApi.update('settings', setting.id, payload)
      } else {
        await adminApi.create('settings', {
          key: 'price_ticker_config',
          category: 'display',
          description: 'Price ticker and Prices page — metals, crypto, stocks, forex',
          ...payload,
        })
      }
      const scrollPayload = { value: scrollMode, valueType: 'string' as const }
      if (scrollSetting) {
        await adminApi.update('settings', scrollSetting.id, scrollPayload)
      } else {
        await adminApi.create('settings', {
          key: 'ticker_scroll_mode',
          category: 'display',
          description: 'Ticker display: auto (marquee) or scrollbar',
          ...scrollPayload,
        })
      }
      await refresh()
      setMessage('Ticker configuration saved. Header ticker and Prices page will update on next refresh.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed')
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
          <h2 className="text-xl font-bold text-vault-900">Price Ticker</h2>
          <p className="text-sm text-vault-500">Choose what appears in the header ticker and Prices page</p>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-vault-200 bg-vault-50 px-4 py-3 text-sm text-vault-700">{message}</div>
      )}

      <Card>
        <h3 className="font-semibold text-vault-900">Ticker Display</h3>
        <p className="mt-0.5 text-xs text-vault-500">When the ticker overflows, choose auto-scroll marquee or manual scrollbar</p>
        <div className="mt-4 flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="scroll" checked={scrollMode === 'auto'} onChange={() => setScrollMode('auto')} />
            Auto-scroll (live ticker)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="scroll" checked={scrollMode === 'scrollbar'} onChange={() => setScrollMode('scrollbar')} />
            Scrollbar
          </label>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-vault-900">Market Alerts</h3>
        <p className="mt-0.5 text-xs text-vault-500">
          Configure per-instrument alert thresholds on{' '}
          <Link to="/prices" className="font-medium text-gold-500 hover:underline">
            Live Prices
          </Link>
          . Users enable delivery in Settings → Notification Preferences.
        </p>
      </Card>

      {SECTIONS.map((section) => (
        <Card key={section.type}>
          <h3 className="font-semibold text-vault-900">{section.title}</h3>
          <p className="mt-0.5 text-xs text-vault-500">{section.description}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items
              .filter((i) => i.type === section.type)
              .map((item) => (
                <label
                  key={`${item.type}-${item.symbol}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-vault-100 px-3 py-2 hover:bg-vault-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-vault-300"
                    checked={item.enabled}
                    onChange={() => toggle(item.type, item.symbol)}
                  />
                  <span className="text-sm font-medium text-vault-800">{item.label ?? item.symbol}</span>
                  <span className="ml-auto font-mono text-xs text-vault-400">{item.symbol}</span>
                </label>
              ))}
          </div>
        </Card>
      ))}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Ticker Config'}
        </button>
      </div>
    </div>
  )
}