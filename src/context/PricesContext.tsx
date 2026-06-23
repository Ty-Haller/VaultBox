import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CryptoPrice, MetalPrice } from '../types'
import { api } from '../lib/api'
import { fetchMetalPrices } from '../lib/prices'
import {
  buildTickerItems,
  enabledSymbols,
  parseTickerConfig,
  parseTickerScrollMode,
  type MarketQuote,
  type TickerConfigItem,
  type TickerDisplayItem,
  type TickerScrollMode,
} from '../lib/tickerConfig'
import { useAdmin } from './AdminContext'

interface PricesContextValue {
  prices: MetalPrice[]
  cryptoPrices: CryptoPrice[]
  marketQuotes: { stocks: MarketQuote[]; forex: MarketQuote[] }
  tickerConfig: TickerConfigItem[]
  tickerScrollMode: TickerScrollMode
  tickerItems: TickerDisplayItem[]
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: string | null
  refresh: () => Promise<void>
}

const PricesContext = createContext<PricesContextValue | null>(null)

export function PricesProvider({ children }: { children: ReactNode }) {
  const { settings } = useAdmin()
  const tickerConfig = useMemo(() => parseTickerConfig(settings), [settings])
  const tickerScrollMode = useMemo(() => parseTickerScrollMode(settings), [settings])

  const [prices, setPrices] = useState<MetalPrice[]>([])
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([])
  const [marketQuotes, setMarketQuotes] = useState<{ stocks: MarketQuote[]; forex: MarketQuote[] }>({
    stocks: [],
    forex: [],
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    const { crypto, stocks, forex } = enabledSymbols(tickerConfig)
    try {
      const [metalData, cryptoData, marketData] = await Promise.all([
        fetchMetalPrices(),
        crypto.length > 0
          ? api.getCryptoPrices(crypto)
          : api.getCryptoPrices().catch(() => []),
        (stocks.length > 0 || forex.length > 0)
          ? api.getMarketQuotes(stocks, forex).catch(() => ({ stocks: [], forex: [] }))
          : Promise.resolve({ stocks: [], forex: [] }),
      ])
      setPrices(Array.isArray(metalData) ? metalData : [])
      setCryptoPrices(Array.isArray(cryptoData) ? cryptoData : [])
      setMarketQuotes(marketData)
      setLastUpdated(new Date().toISOString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch prices')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tickerConfig])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  const tickerItems = useMemo(
    () => buildTickerItems(tickerConfig, prices, cryptoPrices, marketQuotes),
    [tickerConfig, prices, cryptoPrices, marketQuotes]
  )

  const value = useMemo(
    () => ({
      prices,
      cryptoPrices,
      marketQuotes,
      tickerConfig,
      tickerScrollMode,
      tickerItems,
      loading,
      refreshing,
      error,
      lastUpdated,
      refresh,
    }),
    [prices, cryptoPrices, marketQuotes, tickerConfig, tickerScrollMode, tickerItems, loading, refreshing, error, lastUpdated, refresh]
  )

  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>
}

export function usePrices() {
  const ctx = useContext(PricesContext)
  if (!ctx) throw new Error('usePrices must be used within PricesProvider')
  return {
    ...ctx,
    prices: ctx.prices ?? [],
    cryptoPrices: ctx.cryptoPrices ?? [],
    tickerItems: ctx.tickerItems ?? [],
  }
}