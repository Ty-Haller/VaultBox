import type { MetalPrice, MetalType } from '../types'

const BASE_PRICES: Record<MetalType, number> = {
  gold: 2347.5,
  silver: 28.42,
  platinum: 982.3,
  palladium: 1045.8,
}

const METAL_SYMBOLS: Record<MetalType, string> = {
  gold: 'XAU',
  silver: 'XAG',
  platinum: 'XPT',
  palladium: 'XPD',
}

function jitter(base: number, pct = 0.003): number {
  const delta = base * pct * (Math.random() * 2 - 1)
  return Math.round((base + delta) * 100) / 100
}

function buildPrice(metal: MetalType, spot: number): MetalPrice {
  const spread = metal === 'gold' || metal === 'platinum' ? 1.5 : 0.08
  const changePct = (Math.random() * 2 - 1) * 1.2
  const change = (spot * changePct) / 100
  return {
    metal,
    spot,
    bid: spot - spread / 2,
    ask: spot + spread / 2,
    change24h: Math.round(change * 100) / 100,
    changePercent24h: Math.round(changePct * 100) / 100,
    high24h: spot + Math.abs(change) * 0.6,
    low24h: spot - Math.abs(change) * 0.6,
    updatedAt: new Date().toISOString(),
  }
}

export async function fetchMetalPrices(): Promise<MetalPrice[]> {
  try {
    const results = await Promise.allSettled(
      (Object.keys(BASE_PRICES) as MetalType[]).map(async (metal) => {
        const res = await fetch(
          `https://api.gold-api.com/price/${METAL_SYMBOLS[metal]}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (!res.ok) throw new Error('API error')
        const data = (await res.json()) as { price?: number }
        if (typeof data.price === 'number' && data.price > 0) {
          return buildPrice(metal, data.price)
        }
        throw new Error('Invalid price')
      })
    )

    const prices = results
      .filter((r): r is PromiseFulfilledResult<MetalPrice> => r.status === 'fulfilled')
      .map((r) => r.value)

    if (prices.length === 4) return prices
  } catch {
    /* use simulated prices */
  }

  return (Object.keys(BASE_PRICES) as MetalType[]).map((metal) =>
    buildPrice(metal, jitter(BASE_PRICES[metal]))
  )
}