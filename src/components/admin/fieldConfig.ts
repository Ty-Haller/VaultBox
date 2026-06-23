export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'color'

export interface FieldConfig {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: { value: string; label: string }[]
  defaultValue?: string | number | boolean
}

export interface AdminModelConfig {
  resource: string
  title: string
  description: string
  fields: FieldConfig[]
  columns: { key: string; label: string }[]
}

export const SITE_TYPE_CONFIG: AdminModelConfig = {
  resource: 'site-types',
  title: 'Site Types',
  description: 'Classify physical storage locations',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#5a7a96' },
    { key: 'icon', label: 'Icon', type: 'text' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'color', label: 'Color' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const VAULT_TYPE_CONFIG: AdminModelConfig = {
  resource: 'vault-types',
  title: 'Vault Types',
  description: 'Define vault and storage container categories',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'defaultSecurityLevel', label: 'Default Security Level', type: 'number', defaultValue: 3 },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'defaultSecurityLevel', label: 'Security' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const METAL_TYPE_CONFIG: AdminModelConfig = {
  resource: 'metal-types',
  title: 'Metal Types',
  description: 'Precious metals tracked in inventory',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#d4a017' },
    { key: 'apiSymbol', label: 'API Symbol', type: 'text' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'apiSymbol', label: 'Symbol' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const CRYPTO_TOKEN_CONFIG: AdminModelConfig = {
  resource: 'crypto-tokens',
  title: 'Crypto Tokens',
  description: 'Define tokens you hold — BTC, ETH, Doge, custom assets',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'symbol', label: 'Symbol', type: 'text', required: true },
    { key: 'chain', label: 'Chain', type: 'select', options: [
      { value: 'bitcoin', label: 'Bitcoin' },
      { value: 'ethereum', label: 'Ethereum' },
      { value: 'dogecoin', label: 'Dogecoin' },
      { value: 'litecoin', label: 'Litecoin' },
      { value: 'solana', label: 'Solana' },
      { value: 'other', label: 'Other' },
    ], defaultValue: 'bitcoin' },
    { key: 'coingeckoId', label: 'CoinGecko ID', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'symbol', label: 'Symbol' },
    { key: 'name', label: 'Name' },
    { key: 'chain', label: 'Chain' },
    { key: 'coingeckoId', label: 'CoinGecko' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const DEALER_CONFIG: AdminModelConfig = {
  resource: 'dealers',
  title: 'Dealers',
  description: 'Bullion dealers and acquisition sources',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'website', label: 'Website' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const ASSET_CATEGORY_CONFIG: AdminModelConfig = {
  resource: 'asset-categories',
  title: 'Asset Categories',
  description: 'Top-level taxonomy — precious metals, crypto, gems, watches (SD Bullion–style hierarchy)',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'assetClass', label: 'Asset Class', type: 'select', options: [
      { value: 'bullion', label: 'Bullion' },
      { value: 'crypto', label: 'Crypto' },
      { value: 'currency', label: 'Currency' },
      { value: 'gem', label: 'Gems & Jewelry' },
      { value: 'watch', label: 'Watches' },
      { value: 'collectible', label: 'Collectibles' },
      { value: 'other', label: 'Other' },
    ], defaultValue: 'bullion' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'icon', label: 'Icon', type: 'text' },
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#5a7a96' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'assetClass', label: 'Class' },
    { key: 'slug', label: 'Slug' },
    { key: 'color', label: 'Color' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const PRODUCT_TYPE_CONFIG: AdminModelConfig = {
  resource: 'product-types',
  title: 'Bullion Product Types',
  description: 'Specific products — ASE, Gold Buffalo, Silver Maple, etc. (Kitco reference)',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'mint', label: 'Mint', type: 'text' },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'denomination', label: 'Denomination', type: 'text' },
    { key: 'standardWeightOz', label: 'Standard Weight (oz)', type: 'number' },
    { key: 'standardPurity', label: 'Standard Purity', type: 'number' },
    { key: 'kitcoProductRef', label: 'Kitco Product Ref', type: 'text' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'mint', label: 'Mint' },
    { key: 'denomination', label: 'Denomination' },
    { key: 'kitcoProductRef', label: 'Kitco Ref' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const FORM_FACTOR_CONFIG: AdminModelConfig = {
  resource: 'form-factor-types',
  title: 'Form Factors',
  description: 'Physical form — bars, coins, rounds (not product SKU)',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'coin', label: 'Coin' },
      { value: 'bar', label: 'Bar' },
      { value: 'round', label: 'Round' },
      { value: 'grain', label: 'Grain' },
      { value: 'other', label: 'Other' },
    ], defaultValue: 'coin' },
    { key: 'sortOrder', label: 'Sort Order', type: 'number', defaultValue: 0 },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'category', label: 'Category' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const CURRENCY_CONFIG: AdminModelConfig = {
  resource: 'currencies',
  title: 'Currencies',
  description: 'Supported currencies for acquisition costs and valuations',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'symbol', label: 'Symbol', type: 'text', defaultValue: '$' },
    { key: 'exchangeRateToUsd', label: 'Exchange Rate to USD', type: 'number', defaultValue: 1 },
    { key: 'isDefault', label: 'Default', type: 'boolean', defaultValue: false },
    { key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'isDefault', label: 'Default' },
    { key: 'isActive', label: 'Active' },
  ],
}

export const SETTING_CONFIG: AdminModelConfig = {
  resource: 'settings',
  title: 'Other Settings',
  description: 'Application configuration key-value store',
  fields: [
    { key: 'key', label: 'Key', type: 'text', required: true },
    { key: 'value', label: 'Value', type: 'textarea' },
    { key: 'valueType', label: 'Value Type', type: 'select', options: [
      { value: 'string', label: 'String' },
      { value: 'number', label: 'Number' },
      { value: 'boolean', label: 'Boolean' },
      { value: 'json', label: 'JSON' },
    ], defaultValue: 'string' },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'general', label: 'General' },
      { value: 'display', label: 'Display' },
      { value: 'integration', label: 'Integration' },
      { value: 'security', label: 'Security' },
      { value: 'other', label: 'Other' },
    ], defaultValue: 'other' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
  columns: [
    { key: 'key', label: 'Key' },
    { key: 'value', label: 'Value' },
    { key: 'category', label: 'Category' },
    { key: 'valueType', label: 'Type' },
  ],
}

export const NOTIFICATION_CONFIG: AdminModelConfig = {
  resource: 'notification-options',
  title: 'Notification Options',
  description: 'Configure alerts and notification channels',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'eventType', label: 'Event Type', type: 'select', options: [
      { value: 'price_change', label: 'Price Change' },
      { value: 'audit_due', label: 'Audit Due' },
      { value: 'audit_overdue', label: 'Audit Overdue' },
      { value: 'capacity_warning', label: 'Capacity Warning' },
      { value: 'new_acquisition', label: 'New Acquisition' },
      { value: 'insurance_expiry', label: 'Insurance Expiry' },
    ] },
    { key: 'threshold', label: 'Threshold', type: 'number' },
    { key: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true },
    { key: 'emailNotify', label: 'Email', type: 'boolean', defaultValue: false },
    { key: 'inAppNotify', label: 'In-App', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'eventType', label: 'Event' },
    { key: 'enabled', label: 'On' },
    { key: 'emailNotify', label: 'Email' },
    { key: 'inAppNotify', label: 'In-App' },
  ],
}

export const AUDIT_CONFIG: AdminModelConfig = {
  resource: 'audit-workflows',
  title: 'Audit Workflows',
  description: 'Scheduled audit and review workflows',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'appliesTo', label: 'Applies To', type: 'select', options: [
      { value: 'vault', label: 'Vault' },
      { value: 'site', label: 'Site' },
      { value: 'holding', label: 'Holding' },
      { value: 'all', label: 'All' },
    ], defaultValue: 'vault' },
    { key: 'auditType', label: 'Audit Type', type: 'select', options: [
      { value: 'standard', label: 'Standard (product type totals)' },
      { value: 'advanced', label: 'Advanced (per asset / QR)' },
    ], defaultValue: 'standard' },
    { key: 'intervalDays', label: 'Interval (days)', type: 'number', defaultValue: 90 },
    { key: 'reminderDaysBefore', label: 'Reminder (days before)', type: 'number', defaultValue: 14 },
    { key: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true },
    { key: 'autoCreateTasks', label: 'Auto-create Tasks', type: 'boolean', defaultValue: true },
  ],
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'appliesTo', label: 'Applies To' },
    { key: 'auditType', label: 'Audit Type' },
    { key: 'intervalDays', label: 'Interval' },
    { key: 'enabled', label: 'On' },
  ],
}