import type { TickerItemType } from './tickerConfig'

export function priceChartPath(type: TickerItemType, symbol: string): string {
  return `/prices/${type}/${encodeURIComponent(symbol)}`
}

export function parsePriceChartParams(type: string, symbol: string): {
  type: TickerItemType
  symbol: string
} | null {
  const valid: TickerItemType[] = ['metal', 'crypto', 'stock', 'forex']
  if (!valid.includes(type as TickerItemType)) return null
  return { type: type as TickerItemType, symbol: decodeURIComponent(symbol) }
}