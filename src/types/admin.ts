export interface AdminSiteType {
  id: string
  name: string
  slug: string
  description: string
  color: string
  icon: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminVaultType {
  id: string
  name: string
  slug: string
  description: string
  defaultSecurityLevel: number
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminMetalType {
  id: string
  name: string
  slug: string
  description: string
  color: string
  apiSymbol: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminCryptoTokenType {
  id: string
  name: string
  symbol: string
  slug: string
  chain: string
  coingeckoId: string
  description: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminDealer {
  id: string
  name: string
  slug: string
  website: string
  phone: string
  email: string
  notes: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminAssetCategory {
  id: string
  name: string
  slug: string
  assetClass: string
  parentId: string | null
  description: string
  icon: string
  color: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminProductType {
  id: string
  name: string
  slug: string
  categoryId: string | null
  metalTypeId: string | null
  formFactorId: string | null
  metalSlug: string | null
  formFactorSlug: string | null
  description: string
  mint: string
  country: string
  denomination: string
  standardWeightOz: number | null
  standardPurity: number | null
  kitcoProductRef: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminFormFactorType {
  id: string
  name: string
  slug: string
  description: string
  category: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminCurrency {
  id: string
  code: string
  name: string
  symbol: string
  isDefault: boolean
  exchangeRateToUsd: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminAppSetting {
  id: string
  key: string
  value: string
  valueType: 'string' | 'number' | 'boolean' | 'json'
  category: 'general' | 'display' | 'integration' | 'security' | 'other'
  description: string
  createdAt: string
  updatedAt: string
}

export interface AdminNotificationOption {
  id: string
  name: string
  slug: string
  eventType: string
  description: string
  enabled: boolean
  threshold: number | null
  emailNotify: boolean
  inAppNotify: boolean
  createdAt: string
  updatedAt: string
}

export type AuditWorkflowType = 'standard' | 'advanced'

export interface AdminAuditWorkflow {
  id: string
  name: string
  slug: string
  description: string
  appliesTo: string
  auditType: AuditWorkflowType
  intervalDays: number
  reminderDaysBefore: number
  enabled: boolean
  autoCreateTasks: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminPermission {
  id: number
  name: string
  codename: string
}

export interface AdminGroup {
  id: number
  name: string
  permissions: AdminPermission[]
}

export interface AdminUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  isActive: boolean
  isStaff: boolean
  isSuperuser: boolean
  displayName: string
  phone: string
  isAdmin: boolean
  groups: AdminGroup[]
  dateJoined: string
}

export type AdminResource =
  | 'site-types'
  | 'vault-types'
  | 'metal-types'
  | 'crypto-tokens'
  | 'dealers'
  | 'asset-categories'
  | 'product-types'
  | 'form-factor-types'
  | 'currencies'
  | 'settings'
  | 'notification-options'
  | 'audit-workflows'
  | 'users'
  | 'groups'
  | 'permissions'