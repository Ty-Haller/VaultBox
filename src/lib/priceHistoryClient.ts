import type { PriceHistoryPoint } from '../types'
import type { PriceChartRange } from './priceRange'

const RANGE_DAYS: Record<PriceChartRange, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  max: 730,
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function hashSeed(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0
  }
  return h
}

export function generateLocalPriceHistory(
  spot: number,
  range: PriceChartRange,
  seed: string,
  dailyVol = 0.012
): PriceHistoryPoint[] {
  const days = RANGE_DAYS[range]
  const rand = seededRandom(hashSeed(seed))
  const points: PriceHistoryPoint[] = []
  let price = spot
  const today = new Date()

  for (let offset = days; offset >= 0; offset--) {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    if (offset > 0) {
      price = Math.max(price * (1 + gaussian(rand) * dailyVol), spot * 0.2)
    } else {
      price = spot
    }
    points.push({
      timestamp: d.toISOString(),
      price: Math.round(price * 10000) / 10000,
    })
  }

  return points
}