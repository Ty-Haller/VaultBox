import type { CryptoPrice, Holding, MetalPrice, MetalType, PortfolioSnapshot, Vault } from '../types'

export function isActiveHolding(holding: Holding): boolean {
  return !holding.status || holding.status === 'active'
}

export function activeHoldings(holdings: Holding[]): Holding[] {
  return holdings.filter(isActiveHolding)
}

export function pureMetalOz(holding: Holding): number {
  if (holding.assetClass !== 'bullion' || !holding.metalType || holding.weightOz == null) return 0
  return holding.weightOz * (holding.purity ?? 1) * holding.quantity
}

export function holdingSpotValue(
  holding: Holding,
  prices: Record<MetalType, number>,
  cryptoPrices?: Record<string, number>
): number {
  if (holding.assetClass === 'crypto') {
    if (holding.reportedValue != null) return holding.reportedValue
    if (holding.cryptoSymbol && holding.cryptoQuantity && cryptoPrices) {
      const spot = cryptoPrices[holding.cryptoSymbol.toUpperCase()] ?? 0
      return holding.cryptoQuantity * spot
    }
    return (holding.purchasePrice ?? 0) * holding.quantity
  }
  if (holding.reportedValue != null && holding.assetClass !== 'bullion') {
    return holding.reportedValue
  }
  if (!holding.metalType || !prices[holding.metalType as MetalType]) {
    return (holding.purchasePrice ?? 0) * holding.quantity
  }
  return pureMetalOz(holding) * prices[holding.metalType as MetalType]
}

export function cryptoPricesToRecord(prices?: CryptoPrice[] | null): Record<string, number> {
  return (prices ?? []).reduce(
    (acc, p) => {
      acc[p.symbol.toUpperCase()] = p.spot
      return acc
    },
    {} as Record<string, number>
  )
}

export function holdingGainLoss(holding: Holding, spotValue: number) {
  const cost = (holding.purchasePrice ?? 0) * holding.quantity
  const gain = spotValue - cost
  const gainPercent = cost > 0 ? (gain / cost) * 100 : 0
  return { cost, gain, gainPercent }
}

export function aggregateCrypto(holdings: Holding[]) {
  const bySymbol: Record<string, { quantity: number; value: number; count: number }> = {}
  let totalValue = 0
  let totalCount = 0
  for (const h of activeHoldings(holdings)) {
    if (h.assetClass !== 'crypto') continue
    const sym = (h.cryptoSymbol ?? 'UNKNOWN').toUpperCase()
    if (!bySymbol[sym]) bySymbol[sym] = { quantity: 0, value: 0, count: 0 }
    bySymbol[sym].quantity += h.cryptoQuantity ?? 0
    bySymbol[sym].count += 1
    totalCount += 1
  }
  return { bySymbol, totalCount, totalValue }
}

export function cryptoPortfolioValue(
  holdings: Holding[],
  cryptoPrices: Record<string, number>
): { bySymbol: Record<string, { quantity: number; value: number; count: number }>; totalValue: number; totalCount: number } {
  const agg = aggregateCrypto(holdings)
  let totalValue = 0
  for (const [sym, data] of Object.entries(agg.bySymbol)) {
    const spot = cryptoPrices[sym] ?? 0
    const holdingValue = activeHoldings(holdings)
      .filter((h) => h.assetClass === 'crypto' && (h.cryptoSymbol ?? '').toUpperCase() === sym)
      .reduce((sum, h) => {
        if (h.reportedValue != null) return sum + h.reportedValue
        if (h.cryptoQuantity && spot) return sum + h.cryptoQuantity * spot
        return sum + (h.purchasePrice ?? 0) * h.quantity
      }, 0)
    data.value = holdingValue
    totalValue += holdingValue
  }
  return { ...agg, totalValue }
}

export function aggregateByMetal(holdings: Holding[]) {
  const result: Record<MetalType, { oz: number; count: number }> = {
    gold: { oz: 0, count: 0 },
    silver: { oz: 0, count: 0 },
    platinum: { oz: 0, count: 0 },
    palladium: { oz: 0, count: 0 },
  }
  for (const h of activeHoldings(holdings)) {
    if (!h.metalType || h.assetClass !== 'bullion') continue
    result[h.metalType as MetalType].oz += pureMetalOz(h)
    result[h.metalType as MetalType].count += h.quantity
  }
  return result
}

export function portfolioTotals(
  holdings: Holding[],
  prices: Record<MetalType, number>,
  cryptoPrices?: Record<string, number>
) {
  let totalSpot = 0
  let totalCost = 0
  for (const h of activeHoldings(holdings)) {
    const spot = holdingSpotValue(h, prices, cryptoPrices)
    totalSpot += spot
    totalCost += (h.purchasePrice ?? 0) * h.quantity
  }
  const gain = totalSpot - totalCost
  const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0
  return { totalSpot, totalCost, gain, gainPercent }
}

export function vaultUtilization(vault: Vault, holdings: Holding[]) {
  if (!vault.capacityOz) return null
  const used = holdings
    .filter((h) => h.vaultId === vault.id)
    .reduce((sum, h) => sum + pureMetalOz(h), 0)
  return { used, capacity: vault.capacityOz, percent: (used / vault.capacityOz) * 100 }
}

export function pricesToRecord(prices?: MetalPrice[] | null): Record<MetalType, number> {
  return (prices ?? []).reduce(
    (acc, p) => {
      acc[p.metal] = p.spot
      return acc
    },
    {} as Record<MetalType, number>
  )
}

export function buildPortfolioHistory(
  history: PortfolioSnapshot[],
  current: { totalValue: number; totalCost: number; metals: Record<MetalType, number> }
): PortfolioSnapshot[] {
  const today = new Date().toISOString().split('T')[0]
  const last = history[history.length - 1]
  if (last?.date === today) {
    return history.map((s, i) =>
      i === history.length - 1
        ? {
            ...s,
            totalValue: current.totalValue,
            totalCost: current.totalCost,
            goldOz: current.metals.gold,
            silverOz: current.metals.silver,
            platinumOz: current.metals.platinum,
            palladiumOz: current.metals.palladium,
          }
        : s
    )
  }
  return [
    ...history,
    {
      date: today,
      totalValue: current.totalValue,
      totalCost: current.totalCost,
      goldOz: current.metals.gold,
      silverOz: current.metals.silver,
      platinumOz: current.metals.platinum,
      palladiumOz: current.metals.palladium,
    },
  ]
}