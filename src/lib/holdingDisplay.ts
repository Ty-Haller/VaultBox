import type { AdminCryptoTokenType, AdminProductType } from '../types/admin'
import type { Holding } from '../types'

export function holdingBaseName(
  holding: Holding,
  productTypes: AdminProductType[] = [],
  cryptoTokens: AdminCryptoTokenType[] = []
): string {
  if (holding.productTypeId) {
    const pt = productTypes.find((p) => p.id === holding.productTypeId)
    if (pt?.name) return pt.name
  }
  if (holding.assetClass === 'crypto' && holding.cryptoTokenTypeId) {
    const token = cryptoTokens.find((t) => t.id === holding.cryptoTokenTypeId)
    if (token?.name) return token.name
  }
  return holding.name || 'Unnamed Holding'
}

export function holdingDisplayName(
  holding: Holding,
  productTypes: AdminProductType[] = [],
  cryptoTokens: AdminCryptoTokenType[] = []
): string {
  const base = holdingBaseName(holding, productTypes, cryptoTokens)
  if (holding.subName?.trim()) {
    return `${base} — ${holding.subName.trim()}`
  }
  return base
}