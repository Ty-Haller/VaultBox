import type { AdminAppSetting } from '../types/admin'
import type { CryptoPrice, MetalPrice, MetalType } from '../types'

export type TickerItemType = 'metal' | 'crypto' | 'stock' | 'forex'

export interface TickerConfigItem {
  type: TickerItemType
  symbol: string
  label?: string
  enabled: boolean
}

export interface MarketQuote {
  type: 'stock' | 'forex'
  symbol: string
  label: string
  spot: number
  changePercent24h: number
  updatedAt: string
}

export type TickerScrollMode = 'auto' | 'scrollbar'

export interface TickerDisplayItem {
  id: string
  type: TickerItemType
  symbol: string
  label: string
  spot: number
  changePercent24h: number
  color?: string
}

export const DEFAULT_TICKER_CONFIG: TickerConfigItem[] = [
  { type: 'metal', symbol: 'gold', label: 'Gold', enabled: true },
  { type: 'metal', symbol: 'silver', label: 'Silver', enabled: true },
  { type: 'metal', symbol: 'platinum', label: 'Platinum', enabled: true },
  { type: 'metal', symbol: 'palladium', label: 'Palladium', enabled: true },
  { type: 'crypto', symbol: 'BTC', label: 'Bitcoin', enabled: true },
  { type: 'crypto', symbol: 'ETH', label: 'Ethereum', enabled: true },
  { type: 'stock', symbol: 'GLD', label: 'GLD', enabled: true },
  { type: 'stock', symbol: 'SPY', label: 'S&P 500', enabled: false },
  { type: 'forex', symbol: 'EUR', label: 'EUR/USD', enabled: true },
  { type: 'forex', symbol: 'USD', label: 'USD', enabled: false },
]

const METAL_COLORS: Record<string, string> = {
  gold: '#d4a017',
  silver: '#a8b0b8',
  platinum: '#8e9aaf',
  palladium: '#9aa5b1',
}

export function parseTickerScrollMode(settings: AdminAppSetting[]): TickerScrollMode {
  const raw = settings.find((s) => s.key === 'ticker_scroll_mode')?.value
  return raw === 'scrollbar' ? 'scrollbar' : 'auto'
}

export function parseTickerConfig(settings: AdminAppSetting[]): TickerConfigItem[] {
  const raw = settings.find((s) => s.key === 'price_ticker_config')?.value
  if (!raw) return DEFAULT_TICKER_CONFIG
  try {
    const parsed = JSON.parse(raw) as TickerConfigItem[]
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    /* use default */
  }
  return DEFAULT_TICKER_CONFIG
}

export function buildTickerItems(
  config: TickerConfigItem[],
  metals: MetalPrice[],
  crypto: CryptoPrice[],
  market: { stocks: MarketQuote[]; forex: MarketQuote[] }
): TickerDisplayItem[] {
  const enabled = config.filter((c) => c.enabled)
  const items: TickerDisplayItem[] = []

  for (const item of enabled) {
    if (item.type === 'metal') {
      const m = metals.find((p) => p.metal === item.symbol)
      if (!m) continue
      items.push({
        id: `metal-${item.symbol}`,
        type: 'metal',
        symbol: item.symbol,
        label: item.label ?? item.symbol,
        spot: m.spot,
        changePercent24h: m.changePercent24h,
        color: METAL_COLORS[item.symbol],
      })
    } else if (item.type === 'crypto') {
      const c = crypto.find((p) => p.symbol.toUpperCase() === item.symbol.toUpperCase())
      if (!c) continue
      items.push({
        id: `crypto-${item.symbol}`,
        type: 'crypto',
        symbol: c.symbol,
        label: item.label ?? c.symbol,
        spot: c.spot,
        changePercent24h: c.changePercent24h,
        color: '#f7931a',
      })
    } else if (item.type === 'stock') {
      const s = market.stocks.find((p) => p.symbol === item.symbol.toUpperCase())
      if (!s) continue
      items.push({
        id: `stock-${item.symbol}`,
        type: 'stock',
        symbol: s.symbol,
        label: item.label ?? s.label,
        spot: s.spot,
        changePercent24h: s.changePercent24h,
        color: '#3b82f6',
      })
    } else if (item.type === 'forex') {
      const f = market.forex.find((p) => p.symbol === item.symbol.toUpperCase())
      if (!f) continue
      items.push({
        id: `forex-${item.symbol}`,
        type: 'forex',
        symbol: f.symbol,
        label: item.label ?? f.label,
        spot: f.spot,
        changePercent24h: f.changePercent24h,
        color: '#2e8b57',
      })
    }
  }
  return items
}

export function enabledSymbols(config: TickerConfigItem[]) {
  const metals = config.filter((c) => c.enabled && c.type === 'metal').map((c) => c.symbol as MetalType)
  const crypto = config.filter((c) => c.enabled && c.type === 'crypto').map((c) => c.symbol.toUpperCase())
  const stocks = config.filter((c) => c.enabled && c.type === 'stock').map((c) => c.symbol.toUpperCase())
  const forex = config.filter((c) => c.enabled && c.type === 'forex').map((c) => c.symbol.toUpperCase())
  return { metals, crypto, stocks, forex }
}