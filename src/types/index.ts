export type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium'

export type AssetClass =
  | 'bullion'
  | 'crypto'
  | 'currency'
  | 'gem'
  | 'watch'
  | 'collectible'
  | 'other'

export type WalletType = 'hardware' | 'paper' | 'multisig' | 'hot' | 'exchange' | 'other' | ''

export type SecretType =
  | 'recovery_code'
  | 'seed_phrase'
  | 'pin'
  | 'key_location'
  | 'safe_combo'
  | 'qr_backup'
  | 'other'

export type FormFactor =
  | 'bar'
  | 'coin'
  | 'round'
  | 'grain'
  | 'ingot'
  | 'jewelry'
  | 'other'

export type VaultType =
  | 'home-safe'
  | 'bank-deposit'
  | 'private-vault'
  | 'cache'
  | 'depository'

export type Condition = 'mint' | 'proof' | 'bu' | 'au' | 'xf' | 'vf' | 'raw'

export type StorageType = 'capsule' | 'tube' | 'flip' | 'folder' | 'slab' | 'raw' | 'other' | ''

export type HoldingStatus = 'active' | 'sold' | 'stolen' | 'deleted'

export type HoldingTransactionType = 'sold' | 'stolen' | 'deleted'

export type DocumentType = 'invoice' | 'certificate' | 'assay' | 'insurance' | 'other'

export interface Photo {
  id: string
  url: string
  caption: string
  isPrimary: boolean
  uploadedAt: string
}

export interface Document {
  id: string
  url: string
  filename: string
  docType: DocumentType
  uploadedAt: string
}

export interface Site {
  id: string
  name: string
  slug: string
  description: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
  latitude?: number
  longitude?: number
  contactName?: string
  contactPhone?: string
  notes: string
  tags: string[]
  photos?: Photo[]
  createdAt: string
  updatedAt: string
}

export interface Vault {
  id: string
  name: string
  slug: string
  siteId: string
  type: VaultType
  description: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  capacityOz?: number
  securityLevel: 1 | 2 | 3 | 4 | 5
  installDate?: string
  lastAuditDate?: string
  fireRating?: string
  weightCapacityLbs?: number
  notes: string
  tags: string[]
  capacityAlertThresholdPct?: number
  auditIntervalDaysOverride?: number
  auditReminderDaysOverride?: number
  auditRefireHoursOverride?: number
  photos?: Photo[]
  createdAt: string
  updatedAt: string
}

export type InventoryStatusFilter = 'active' | 'sold' | 'stolen' | 'archived'

export interface Holding {
  id: string
  name: string
  subName?: string
  vaultId: string
  assetClass: AssetClass
  assetCategoryId?: string
  productTypeId?: string
  metalType: MetalType | ''
  formFactor: FormFactor | ''
  weightOz?: number
  purity?: number
  quantity: number
  purchaseDate?: string
  purchasePrice?: number
  purchasePricePerOz?: number
  dealerId?: string
  dealer?: string
  invoiceNumber?: string
  serialNumber?: string
  mint?: string
  year?: number
  country?: string
  condition: Condition
  gradingService?: string
  grade?: string
  certificateNumber?: string
  vaultLocation?: string
  storageType?: StorageType
  storageNotes?: string
  insured: boolean
  insuranceValue?: number
  cryptoTokenTypeId?: string
  publicAddress?: string
  cryptoSymbol?: string
  cryptoQuantity?: number
  walletType?: WalletType
  walletLocation?: string
  seedPhrase?: string
  hasSeedPhrase?: boolean
  reportedValue?: number
  valueGainAlertPct?: number
  valueLossAlertPct?: number
  status?: HoldingStatus
  archivedAt?: string
  transactionType?: HoldingTransactionType | ''
  transactionDate?: string
  salePrice?: number
  buyerName?: string
  insuranceClaimNumber?: string
  transactionNotes?: string
  notes: string
  tags: string[]
  qrCode?: string
  photos?: Photo[]
  documents?: Document[]
  createdAt: string
  updatedAt: string
}

export interface KitcoSearchResult {
  source: 'catalog' | 'product_type'
  slug: string
  name: string
  metalSlug: string
  formFactorSlug: string
  mint: string
  country: string
  standardWeightOz: number | null
  standardPurity: number | null
  kitcoProductRef: string
  productTypeId: string | null
  categoryId?: string | null
}

export interface CryptoPrice {
  symbol: string
  spot: number
  changePercent24h: number
  updatedAt: string
}

export interface AuditLineItem {
  id: string
  lineKind: 'product_type' | 'holding'
  holdingId: string | null
  holdingName: string
  productTypeId?: string | null
  holdingQrCode?: string | null
  holdingSerial?: string | null
  expectedQty: number
  currentCount: number | null
  countedQty: number | null
  verified: boolean
  discrepancyNotes: string
}

export type AuditType = 'standard' | 'advanced'

export interface AuditSession {
  id: string
  vaultId: string
  vaultName: string
  auditType: AuditType
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled'
  performedBy: string
  notes: string
  discrepancyCount: number
  startedAt: string
  completedAt?: string
  lineItems: AuditLineItem[]
}

export interface ChangeLogEntry {
  id: string
  entityType: string
  entityId: string
  entityLabel: string
  action: 'create' | 'update' | 'delete' | 'transact'
  performedBy: string
  changes: Record<string, unknown>
  notes: string
  createdAt: string
}

export interface HoldingTransactPayload {
  type: HoldingTransactionType
  transactionDate?: string
  salePrice?: number
  buyerName?: string
  insuranceClaimNumber?: string
  transactionNotes?: string
  performedBy?: string
}

export const HOLDING_STATUS_LABELS: Record<HoldingStatus, string> = {
  active: 'Active',
  sold: 'Sold',
  stolen: 'Stolen',
  deleted: 'Deleted',
}

export interface AuditReport {
  id: string
  auditId: string
  vaultName: string
  reportData: Record<string, unknown>
  createdAt: string
}

export interface SecretAttachment {
  id: string
  url: string
  filename: string
  attachmentType: string
  uploadedAt: string
}

export interface Secret {
  id: string
  label: string
  secretType: SecretType
  vaultId?: string
  siteId?: string
  content?: string
  hasContent: boolean
  notes: string
  tags: string[]
  attachments: SecretAttachment[]
  createdAt: string
  updatedAt: string
}

export interface MetalPrice {
  metal: MetalType
  spot: number
  bid: number
  ask: number
  change24h: number
  changePercent24h: number
  high24h: number
  low24h: number
  updatedAt: string
}

export interface PriceHistoryPoint {
  timestamp: string
  price: number
}

export interface PriceHistory {
  type: 'metal' | 'crypto' | 'stock' | 'forex'
  symbol: string
  range: string
  source: string
  points: PriceHistoryPoint[]
}

export interface PortfolioSnapshot {
  date: string
  totalValue: number
  totalCost: number
  goldOz: number
  silverOz: number
  platinumOz: number
  palladiumOz: number
}

export interface VaultBoxState {
  sites: Site[]
  vaults: Vault[]
  holdings: Holding[]
  portfolioHistory: PortfolioSnapshot[]
}

export const METAL_LABELS: Record<MetalType, string> = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
}

export const METAL_COLORS: Record<MetalType, string> = {
  gold: '#d4a017',
  silver: '#a8b0b8',
  platinum: '#8e9aaf',
  palladium: '#9aa5b1',
}

export const VAULT_TYPE_LABELS: Record<VaultType, string> = {
  'home-safe': 'Home Safe',
  'bank-deposit': 'Bank Deposit Box',
  'private-vault': 'Private Vault',
  cache: 'Cache / Hide',
  depository: 'Depository',
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  bullion: 'Bullion / Precious Metals',
  crypto: 'Cryptocurrency',
  currency: 'Fiat Currency',
  gem: 'Gems & Jewelry',
  watch: 'Watches',
  collectible: 'Collectibles',
  other: 'Other',
}

export const WALLET_TYPE_LABELS: Record<string, string> = {
  hardware: 'Hardware Wallet',
  paper: 'Paper Wallet',
  multisig: 'Multisig',
  hot: 'Hot Wallet',
  exchange: 'Exchange Custody',
  other: 'Other',
}

export const SECRET_TYPE_LABELS: Record<SecretType, string> = {
  recovery_code: 'Recovery Code',
  seed_phrase: 'Seed Phrase',
  pin: 'PIN / Passphrase',
  key_location: 'Physical Key Location',
  safe_combo: 'Safe Combination',
  qr_backup: 'QR Backup',
  other: 'Other',
}

export const FORM_FACTOR_LABELS: Record<FormFactor, string> = {
  bar: 'Bar',
  coin: 'Coin',
  round: 'Round',
  grain: 'Grain / Shot',
  ingot: 'Ingot',
  jewelry: 'Jewelry',
  other: 'Other',
}

export const STORAGE_TYPE_LABELS: Record<Exclude<StorageType, ''>, string> = {
  capsule: 'Capsule',
  tube: 'Tube',
  flip: 'Flip',
  folder: 'Folder',
  slab: 'Slab',
  raw: 'Raw / Loose',
  other: 'Other',
}