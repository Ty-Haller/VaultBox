export type NotificationSeverity = 'info' | 'warning' | 'critical'

export type NotificationCategory = 'audit' | 'admin' | 'market' | 'asset' | 'activity'

export interface InboxNotification {
  id: string
  eventType: string
  severity: NotificationSeverity
  title: string
  message: string
  link: string
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export type NotificationConfigScope = 'user' | 'market_admin' | 'instrument' | 'vault' | 'holding'

export interface NotificationPreferenceEvent {
  eventType: string
  category: NotificationCategory
  name: string
  description: string
  configScope?: NotificationConfigScope
  allowed: boolean
  enabled: boolean
  inApp: boolean
  email: boolean
  apprise: boolean
  threshold: number | null
  refireIntervalHours: number | null
  userOverride: {
    eventType: string
    enabled: boolean | null
    inApp: boolean | null
    email: boolean | null
    apprise: boolean | null
    threshold: number | null
    refireIntervalHours: number | null
  } | null
}

export interface NotificationPreferencesResponse {
  events: NotificationPreferenceEvent[]
  appriseUrls: string[]
}

export interface AdminNotificationCatalogItem {
  id: string
  name: string
  slug: string
  eventType: string
  category: NotificationCategory
  description: string
  enabled: boolean
  threshold: number | null
  emailNotify: boolean
  inAppNotify: boolean
  appriseNotify: boolean
  refireIntervalHours: number | null
  isSystemDefault: boolean
}

export interface RoleNotificationDefault {
  id: string
  role: string
  eventType: string
  enabled: boolean | null
  inApp: boolean | null
  email: boolean | null
  apprise: boolean | null
  threshold: number | null
  refireIntervalHours: number | null
}

export interface MarketAlertConfig {
  percentChangeThreshold: number
  priceAbove: number | null
  priceBelow: number | null
}

export interface InstrumentMarketAlert extends MarketAlertConfig {
  type: string
  symbol: string
}

export interface InstrumentMarketAlertList {
  instruments: InstrumentMarketAlert[]
}

export interface SmtpDeliveryConfig {
  enabled: boolean
  host: string
  port: number
  tls: boolean
  user: string
  fromEmail: string
  hasPassword: boolean
}