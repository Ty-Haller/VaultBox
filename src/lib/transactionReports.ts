import { isActiveHolding } from './calculations'
import { dateInRange, type DateRange } from './dateRange'
import type { Holding } from '../types'

export function holdingCost(h: Holding): number {
  return (h.purchasePrice ?? 0) * h.quantity
}

export interface PurchaseRow {
  id: string
  holding: Holding
  totalCost: number
  vaultLabel: string
}

export interface SaleRow {
  id: string
  holding: Holding
  cost: number
  proceeds: number
  gain: number
  vaultLabel: string
}

export function buildPurchaseRows(
  holdings: Holding[],
  range: DateRange,
  vaultName: (vaultId: string) => string
): PurchaseRow[] {
  return holdings
    .filter((h) => dateInRange(h.purchaseDate, range))
    .map((h) => ({
      id: h.id,
      holding: h,
      totalCost: holdingCost(h),
      vaultLabel: vaultName(h.vaultId),
    }))
    .sort((a, b) => (b.holding.purchaseDate ?? '').localeCompare(a.holding.purchaseDate ?? ''))
}

export function buildSaleRows(
  holdings: Holding[],
  range: DateRange,
  vaultName: (vaultId: string) => string
): SaleRow[] {
  return holdings
    .filter((h) => h.status === 'sold' && dateInRange(h.transactionDate, range))
    .map((h) => {
      const cost = holdingCost(h)
      const proceeds = h.salePrice ?? 0
      return {
        id: h.id,
        holding: h,
        cost,
        proceeds,
        gain: proceeds - cost,
        vaultLabel: vaultName(h.vaultId),
      }
    })
    .sort((a, b) =>
      (b.holding.transactionDate ?? '').localeCompare(a.holding.transactionDate ?? '')
    )
}

export function buildUnrealizedHoldings(holdings: Holding[], range: DateRange): Holding[] {
  return holdings
    .filter((h) => isActiveHolding(h) && dateInRange(h.purchaseDate, range))
    .sort((a, b) => (b.purchaseDate ?? '').localeCompare(a.purchaseDate ?? ''))
}