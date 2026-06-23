import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PriceChart } from '../components/charts/PriceChart'
import { MarketAlertCard } from '../components/prices/MarketAlertCard'
import { Card } from '../components/ui/Card'
import { api } from '../lib/api'
import { generateLocalPriceHistory } from '../lib/priceHistoryClient'
import { usePrices } from '../hooks/usePrices'
import {
  PRICE_CHART_RANGE_LABELS,
  PRICE_CHART_RANGES,
  type PriceChartRange,
} from '../lib/priceRange'
import { parsePriceChartParams } from '../lib/priceRoutes'
import { METAL_COLORS, METAL_LABELS, type MetalType } from '../types'
import { formatCurrency, formatPercent } from '../lib/utils'

export function PriceChartPage() {
  const { type: typeParam, symbol: symbolParam } = useParams()
  const parsed = useMemo(
    () => (typeParam && symbolParam ? parsePriceChartParams(typeParam, symbolParam) : null),
    [typeParam, symbolParam]
  )
  const { tickerItems, refresh, refreshing } = usePrices()

  const [range, setRange] = useState<PriceChartRange>('30d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [points, setPoints] = useState<{ timestamp: string; price: number }[]>([])

  const live = useMemo(() => {
    if (!parsed) return null
    return tickerItems.find(
      (item) =>
        item.type === parsed.type &&
        item.symbol.toLowerCase() === parsed.symbol.toLowerCase()
    )
  }, [parsed, tickerItems])

  const periodStats = useMemo(() => {
    if (points.length < 2) return null
    const prices = points.map((p) => p.price)
    const first = prices[0]
    const last = prices[prices.length - 1]
    const change = last - first
    const changePct = first !== 0 ? (change / first) * 100 : 0
    return {
      high: Math.max(...prices),
      low: Math.min(...prices),
      change,
      changePct,
    }
  }, [points])

  useEffect(() => {
    if (!parsed) return

    const controller = new AbortController()
    const seed = `${parsed.type}-${parsed.symbol}`
    const spot = live?.spot

    if (spot != null && spot > 0) {
      setPoints(generateLocalPriceHistory(spot, range, seed))
      setSource('local')
      setError(null)
      setLoading(false)
    } else {
      setLoading(true)
      setError(null)
    }

    api
      .getPriceHistory(parsed.type, parsed.symbol, range, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        if (data.points?.length) {
          setPoints(data.points)
          setSource(data.source)
          setError(null)
        }
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        if (spot != null && spot > 0) return
        setError(e instanceof Error ? e.message : 'Failed to load price history')
        setPoints([])
        setSource(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [parsed, range, live?.spot])

  if (!parsed) {
    return <Navigate to="/prices" replace />
  }

  const label = live?.label ?? parsed.symbol
  const color =
    live?.color ??
    (parsed.type === 'metal' ? METAL_COLORS[parsed.symbol as MetalType] : '#5a7a96')
  const isForex = parsed.type === 'forex' && parsed.symbol.toUpperCase() !== 'USD'
  const spot = live?.spot ?? points[points.length - 1]?.price

  const formatPrice = (value: number) => (isForex ? value.toFixed(4) : formatCurrency(value))

  const handleRefresh = () => {
    refresh()
    if (!parsed) return
    const controller = new AbortController()
    const seed = `${parsed.type}-${parsed.symbol}`
    const liveSpot = live?.spot
    if (liveSpot != null && liveSpot > 0) {
      setPoints(generateLocalPriceHistory(liveSpot, range, seed))
      setSource('local')
    }
    setLoading(true)
    api
      .getPriceHistory(parsed.type, parsed.symbol, range, controller.signal)
      .then((data) => {
        if (data.points?.length) {
          setPoints(data.points)
          setSource(data.source)
        }
      })
      .catch(() => {
        /* keep local preview if available */
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/prices"
          className="inline-flex items-center gap-2 text-sm font-medium text-vault-600 hover:text-vault-900 dark:text-vault-400 dark:hover:text-vault-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Live Prices
        </Link>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 rounded-md border border-vault-200 px-3 py-1.5 text-sm text-vault-700 hover:bg-vault-100 disabled:opacity-50 dark:border-vault-600 dark:text-vault-200 dark:hover:bg-vault-800"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {parsed.symbol.slice(0, parsed.type === 'forex' ? 3 : 1).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-vault-900 dark:text-white">{label}</h2>
          <p className="text-sm capitalize text-vault-500 dark:text-vault-400">
            {parsed.type === 'metal'
              ? (METAL_LABELS[parsed.symbol as MetalType] ?? parsed.symbol)
              : parsed.type}
            {source && ` · ${source} data`}
          </p>
        </div>
        {spot != null && (
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold tabular-nums text-vault-900 dark:text-white">
              {formatPrice(spot)}
            </p>
            {live && (
              <p
                className={`text-sm font-medium ${live.changePercent24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {live.changePercent24h >= 0 ? (
                  <TrendingUp className="mr-1 inline h-4 w-4" />
                ) : (
                  <TrendingDown className="mr-1 inline h-4 w-4" />
                )}
                {formatPercent(live.changePercent24h)} (24h)
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRICE_CHART_RANGES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              range === key
                ? 'bg-gold-500 text-white'
                : 'border border-vault-200 bg-white text-vault-600 hover:bg-vault-50 dark:border-vault-600 dark:bg-vault-900 dark:text-vault-300 dark:hover:bg-vault-800'
            }`}
          >
            {PRICE_CHART_RANGE_LABELS[key]}
          </button>
        ))}
      </div>

      <Card>
        {loading && points.length === 0 ? (
          <p className="py-24 text-center text-sm text-vault-500 dark:text-vault-400">
            Loading chart…
          </p>
        ) : error && points.length === 0 ? (
          <p className="py-24 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : points.length === 0 ? (
          <p className="py-24 text-center text-sm text-vault-500 dark:text-vault-400">
            No chart data available.
          </p>
        ) : (
          <PriceChart points={points} range={range} color={color} forex={isForex} />
        )}
      </Card>

      {live && (
        <MarketAlertCard
          type={parsed.type}
          symbol={parsed.symbol}
          label={label}
          forex={isForex}
        />
      )}

      {periodStats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-vault-500">Period High</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-vault-900 dark:text-white">
              {formatPrice(periodStats.high)}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-vault-500">Period Low</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-vault-900 dark:text-white">
              {formatPrice(periodStats.low)}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-vault-500">
              Period Change
            </p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${periodStats.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {periodStats.change >= 0 ? '+' : ''}
              {formatPrice(periodStats.change)}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-vault-500">Period %</p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${periodStats.changePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {formatPercent(periodStats.changePct)}
            </p>
          </Card>
        </div>
      )}

      {!live && (
        <p className="text-sm text-vault-500 dark:text-vault-400">
          This instrument is not in the current ticker configuration.{' '}
          <Link to="/admin/price-ticker" className="font-medium text-gold-500 hover:underline">
            Configure ticker
          </Link>
        </p>
      )}
    </div>
  )
}