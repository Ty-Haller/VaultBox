import type { AssetClass } from '../types'

export type HoldingFieldKey =
  | 'subName'
  | 'productTypeId'
  | 'kitcoSearch'
  | 'metalType'
  | 'formFactor'
  | 'weightOz'
  | 'purity'
  | 'quantity'
  | 'condition'
  | 'cryptoTokenTypeId'
  | 'publicAddress'
  | 'cryptoQuantity'
  | 'walletType'
  | 'walletLocation'
  | 'seedPhrase'
  | 'reportedValue'
  | 'purchaseDate'
  | 'dealerId'
  | 'purchasePrice'
  | 'purchasePricePerOz'
  | 'invoiceNumber'
  | 'serialNumber'
  | 'mint'
  | 'year'
  | 'country'
  | 'vaultLocation'
  | 'storageType'
  | 'storageNotes'
  | 'gradingService'
  | 'grade'
  | 'certificateNumber'
  | 'insured'
  | 'insuranceValue'
  | 'tags'
  | 'notes'

const BULLION_FIELDS: HoldingFieldKey[] = [
  'kitcoSearch', 'productTypeId', 'subName', 'metalType', 'formFactor',
  'weightOz', 'purity', 'quantity', 'condition',
  'purchaseDate', 'dealerId', 'purchasePrice', 'purchasePricePerOz', 'invoiceNumber',
  'serialNumber', 'mint', 'year', 'country', 'vaultLocation', 'storageType', 'storageNotes',
  'gradingService', 'grade', 'certificateNumber', 'insured', 'insuranceValue',
  'tags', 'notes',
]

const CRYPTO_FIELDS: HoldingFieldKey[] = [
  'cryptoTokenTypeId', 'subName', 'publicAddress', 'cryptoQuantity',
  'walletType', 'walletLocation', 'reportedValue', 'seedPhrase',
  'purchaseDate', 'purchasePrice', 'notes', 'tags',
]

const CURRENCY_FIELDS: HoldingFieldKey[] = [
  'reportedValue', 'quantity',
  'purchaseDate', 'dealerId', 'purchasePrice', 'invoiceNumber', 'vaultLocation',
  'serialNumber', 'country', 'insured', 'insuranceValue', 'tags', 'notes',
]

const GEM_FIELDS: HoldingFieldKey[] = [
  'reportedValue', 'quantity', 'condition',
  'purchaseDate', 'dealerId', 'purchasePrice', 'invoiceNumber',
  'serialNumber', 'mint', 'year', 'country', 'vaultLocation',
  'gradingService', 'grade', 'certificateNumber', 'insured', 'insuranceValue',
  'tags', 'notes',
]

const WATCH_FIELDS: HoldingFieldKey[] = GEM_FIELDS
const COLLECTIBLE_FIELDS: HoldingFieldKey[] = GEM_FIELDS

const OTHER_FIELDS: HoldingFieldKey[] = [
  'reportedValue', 'quantity',
  'purchaseDate', 'dealerId', 'purchasePrice', 'purchasePricePerOz',
  'invoiceNumber', 'serialNumber', 'vaultLocation',
  'insured', 'insuranceValue', 'tags', 'notes',
]

const FIELD_MAP: Record<AssetClass, HoldingFieldKey[]> = {
  bullion: BULLION_FIELDS,
  crypto: CRYPTO_FIELDS,
  currency: CURRENCY_FIELDS,
  gem: GEM_FIELDS,
  watch: WATCH_FIELDS,
  collectible: COLLECTIBLE_FIELDS,
  other: OTHER_FIELDS,
}

export function fieldsForAssetClass(assetClass: AssetClass): Set<HoldingFieldKey> {
  return new Set(FIELD_MAP[assetClass] ?? OTHER_FIELDS)
}

export function isFieldVisible(assetClass: AssetClass, field: HoldingFieldKey): boolean {
  return fieldsForAssetClass(assetClass).has(field)
}