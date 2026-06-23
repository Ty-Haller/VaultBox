import { ChevronRight, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePrices } from '../hooks/usePrices'
import { priceChartPath } from '../lib/priceRoutes'
import { METAL_COLORS, METAL_LABELS, type MetalType } from '../types'
import { formatCurrency, formatDateTime, formatPercent } from '../lib/utils'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

const TYPE_LABELS = {
  metal: 'Precious Metals',
  crypto: 'Cryptocurrency',
  stock: 'Stocks & ETFs',
  forex: 'Forex / USD',
} as const

export function Prices() {
  const { tickerItems, tickerConfig, refreshing, error, lastUpdated, refresh } = usePrices()
  const enabledCount = tickerConfig.filter((c) => c.enabled).length

  const grouped = {
    metal: tickerItems.filter((i) => i.type === 'metal'),
    crypto: tickerItems.filter((i) => i.type === 'crypto'),
    stock: tickerItems.filter((i) => i.type === 'stock'),
    forex: tickerItems.filter((i) => i.type === 'forex'),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-vault-600 dark:text-vault-400">
          {enabledCount} instruments configured
          {lastUpdated && ` · Updated ${formatDateTime(lastUpdated)}`}
        </p>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/price-ticker"
            className="text-sm font-medium text-gold-500 hover:underline"
          >
            Configure ticker →
          </Link>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-vault-200 px-3 py-1.5 text-sm text-vault-700 hover:bg-vault-100 disabled:opacity-50 dark:border-vault-600 dark:text-vault-200 dark:hover:bg-vault-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {error} — showing available fallback prices where possible.
        </div>
      )}

      {tickerItems.length === 0 ? (
        <Card>
          <p className="text-sm text-vault-600 dark:text-vault-300">
            No price instruments enabled.{' '}
            <Link to="/admin/price-ticker" className="font-medium text-gold-500 hover:underline">
              Configure the price ticker
            </Link>{' '}
            to show metals, crypto, stocks, or forex.
          </p>
        </Card>
      ) : (
        (Object.keys(grouped) as (keyof typeof grouped)[]).map((type) => {
          const items = grouped[type]
          if (items.length === 0) return null
          return (
            <div key={type}>
              <h3 className="mb-3 text-lg font-semibold text-vault-900 dark:text-vault-100">{TYPE_LABELS[type]}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {items.map((p) => (
                  <Link
                    key={p.id}
                    to={priceChartPath(p.type, p.symbol)}
                    className="group block rounded-lg transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  >
                  <Card className="h-full transition-colors group-hover:border-gold-500/40">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                        style={{ backgroundColor: p.color ?? (p.type === 'metal' ? METAL_COLORS[p.symbol as MetalType] : '#5a7a96') }}
                      >
                        {p.symbol.slice(0, p.type === 'forex' ? 3 : 1).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-vault-900 dark:text-vault-100">{p.label}</h3>
                        {p.type === 'metal' && (
                          <Badge variant={p.symbol as MetalType}>{METAL_LABELS[p.symbol as MetalType]}</Badge>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 text-3xl font-bold tabular-nums text-vault-900 dark:text-white">
                      {p.type === 'forex' && p.symbol !== 'USD' ? p.spot.toFixed(4) : formatCurrency(p.spot)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      {p.changePercent24h >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-sm font-medium ${p.changePercent24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercent(p.changePercent24h)}
                      </span>
                      <ChevronRight className="ml-auto h-4 w-4 text-vault-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-500 dark:text-vault-600" />
                    </div>
                  </Card>
                  </Link>
                ))}
              </div>
            </div>
          )
        })
      )}

      <Card>
        <CardHeader
          title="Price Feed"
          subtitle="Configure instruments in Admin → Price Ticker"
        />
        <p className="text-sm text-vault-600 dark:text-vault-300">
          Metals via gold-api.com; crypto via CoinGecko; stocks and forex use reference quotes.
          The header ticker and this page share the same admin configuration.
        </p>
      </Card>
    </div>
  )
}