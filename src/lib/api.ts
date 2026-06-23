import type {
  AuditReport,
  AuditSession,
  ChangeLogEntry,
  CryptoPrice,
  Document,
  Holding,
  HoldingTransactPayload,
  KitcoSearchResult,
  Photo,
  PortfolioSnapshot,
  PriceHistory,
  Secret,
  SecretAttachment,
  Site,
  Vault,
} from '../types'
import type {
  InstrumentMarketAlert,
  InstrumentMarketAlertList,
  InboxNotification,
  MarketAlertConfig,
} from '../types/notifications'

import { authFetch } from './authFetch'
import { formatApiError } from './apiError'
import { fetchTimeoutSignal } from './fetchTimeout'

const API_BASE = '/api'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { signal, headers: extraHeaders, ...rest } = options ?? {}
  const res = await authFetch(`${API_BASE}${path}`, {
    ...rest,
    headers: { Accept: 'application/json', ...(extraHeaders as Record<string, string>) },
    signal: signal ?? fetchTimeoutSignal(15000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(formatApiError(text, res.status), res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function requestForm<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
  const res = await authFetch(`${API_BASE}${path}`, { method, body: formData })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(formatApiError(text, res.status), res.status)
  }
  return res.json() as Promise<T>
}

interface Paginated<T> {
  results?: T[]
  count?: number
}

function unwrap<T>(data: T[] | Paginated<T>): T[] {
  if (Array.isArray(data)) return data
  return data.results ?? []
}

export const api = {
  async getSites(): Promise<Site[]> {
    return unwrap(await request<Site[] | Paginated<Site>>('/sites/'))
  },
  createSite(data: Omit<Site, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>): Promise<Site> {
    return request('/sites/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  },
  updateSite(id: string, data: Partial<Site>): Promise<Site> {
    return request(`/sites/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  },
  deleteSite(id: string): Promise<void> {
    return request(`/sites/${id}/`, { method: 'DELETE' })
  },

  async getVaults(siteId?: string): Promise<Vault[]> {
    const q = siteId ? `?site=${siteId}` : ''
    return unwrap(await request<Vault[] | Paginated<Vault>>(`/vaults/${q}`))
  },
  createVault(data: Omit<Vault, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>): Promise<Vault> {
    return request('/vaults/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  },
  updateVault(id: string, data: Partial<Vault>): Promise<Vault> {
    return request(`/vaults/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  },
  deleteVault(id: string): Promise<void> {
    return request(`/vaults/${id}/`, { method: 'DELETE' })
  },

  async getHoldings(params?: {
    vault?: string
    metal?: string
    assetClass?: string
    status?: string
    includeArchived?: boolean
  }): Promise<Holding[]> {
    const search = new URLSearchParams()
    if (params?.vault) search.set('vault', params.vault)
    if (params?.metal) search.set('metal', params.metal)
    if (params?.assetClass) search.set('asset_class', params.assetClass)
    if (params?.status) search.set('status', params.status)
    if (params?.includeArchived) search.set('include_archived', 'true')
    const q = search.toString() ? `?${search}` : ''
    return unwrap(await request<Holding[] | Paginated<Holding>>(`/holdings/${q}`))
  },
  getHolding(id: string): Promise<Holding> {
    return request(`/holdings/${id}/`)
  },
  lookupByQR(code: string): Promise<Holding> {
    return request(`/lookup/${code}/`)
  },
  createHolding(data: Omit<Holding, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'documents' | 'qrCode'>): Promise<Holding> {
    return request('/holdings/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  },
  updateHolding(id: string, data: Partial<Holding>): Promise<Holding> {
    return request(`/holdings/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  },
  deleteHolding(id: string): Promise<void> {
    return request(`/holdings/${id}/`, { method: 'DELETE' })
  },
  transactHolding(id: string, data: HoldingTransactPayload): Promise<Holding> {
    return request(`/holdings/${id}/transact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async getChangeLog(params?: {
    entityType?: string
    entityId?: string
    action?: string
  }): Promise<ChangeLogEntry[]> {
    const search = new URLSearchParams()
    if (params?.entityType) search.set('entity_type', params.entityType)
    if (params?.entityId) search.set('entity_id', params.entityId)
    if (params?.action) search.set('action', params.action)
    const q = search.toString() ? `?${search}` : ''
    return unwrap(await request<ChangeLogEntry[] | Paginated<ChangeLogEntry>>(`/changelog/${q}`))
  },

  getPortfolioHistory(): Promise<PortfolioSnapshot[]> {
    return request('/portfolio-history/')
  },
  seedData(): Promise<{ status: string }> {
    return request('/seed/', { method: 'POST' })
  },

  uploadPhoto(file: File, opts: { holding?: string; vault?: string; site?: string; caption?: string; isPrimary?: boolean }): Promise<Photo> {
    const form = new FormData()
    form.append('image', file)
    if (opts.holding) form.append('holding', opts.holding)
    if (opts.vault) form.append('vault', opts.vault)
    if (opts.site) form.append('site', opts.site)
    if (opts.caption) form.append('caption', opts.caption)
    if (opts.isPrimary) form.append('is_primary', 'true')
    return requestForm('/photos/', form)
  },
  deletePhoto(id: string): Promise<void> {
    return request(`/photos/${id}/`, { method: 'DELETE' })
  },

  uploadDocument(file: File, holdingId: string, docType: string): Promise<Document> {
    const form = new FormData()
    form.append('file', file)
    form.append('holding', holdingId)
    form.append('doc_type', docType)
    return requestForm('/documents/', form)
  },
  deleteDocument(id: string): Promise<void> {
    return request(`/documents/${id}/`, { method: 'DELETE' })
  },

  qrImageUrl(holdingId: string): string {
    return `${API_BASE}/holdings/${holdingId}/qr/`
  },
  reportPdfUrl(
    type: 'portfolio' | 'inventory' | 'labels' | 'purchase-sale' | 'profit-loss',
    params?: {
      holdings?: string[]
      from?: string | null
      to?: string | null
      charts?: boolean
    }
  ): string {
    const search = new URLSearchParams()
    if (type === 'labels' && params?.holdings?.length) {
      search.set('holdings', params.holdings.join(','))
    }
    if (type === 'purchase-sale' || type === 'profit-loss') {
      if (params?.from) search.set('from', params.from)
      if (params?.to) search.set('to', params.to)
    }
    if (type === 'profit-loss' && params?.charts) {
      search.set('charts', 'true')
    }
    const q = search.toString() ? `?${search}` : ''
    return `${API_BASE}/reports/${type}.pdf${q}`
  },

  async getMarketQuotes(stocks: string[] = [], forex: string[] = []): Promise<{
    stocks: import('./tickerConfig').MarketQuote[]
    forex: import('./tickerConfig').MarketQuote[]
  }> {
    const params = new URLSearchParams()
    if (stocks.length) params.set('stocks', stocks.join(','))
    if (forex.length) params.set('forex', forex.join(','))
    const q = params.toString() ? `?${params}` : ''
    return request(`/market-quotes/${q || ''}`)
  },

  async fetchChainBalance(address: string, symbol: string, chain?: string): Promise<{ balance: number | null; error?: string }> {
    return request('/chain-balance/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, symbol, chain }),
    })
  },

  async searchKitco(query: string, limit = 15): Promise<KitcoSearchResult[]> {
    const q = encodeURIComponent(query)
    return request<KitcoSearchResult[]>(`/kitco/search/?q=${q}&limit=${limit}`)
  },

  async getCryptoPrices(symbols?: string[]): Promise<CryptoPrice[]> {
    const q = symbols?.length ? `?symbols=${symbols.join(',')}` : ''
    const data = await request<CryptoPrice[] | Paginated<CryptoPrice>>(`/crypto-prices/${q}`)
    return Array.isArray(data) ? data : unwrap(data)
  },

  getPriceHistory(type: string, symbol: string, range: string, signal?: AbortSignal): Promise<PriceHistory> {
    const params = new URLSearchParams({ type, symbol, range })
    return request(`/price-history/?${params}`, {
      signal: signal ?? fetchTimeoutSignal(30000),
    })
  },

  async getAudits(vaultId?: string): Promise<AuditSession[]> {
    const q = vaultId ? `?vault=${vaultId}` : ''
    return unwrap(await request<AuditSession[] | Paginated<AuditSession>>(`/audits/${q}`))
  },
  getAudit(auditId: string): Promise<AuditSession> {
    return request(`/audits/${auditId}/`)
  },
  createAudit(
    vaultId: string,
    options?: {
      performedBy?: string
      auditType?: 'standard' | 'advanced'
      forceNew?: boolean
    }
  ): Promise<AuditSession> {
    return request('/audits/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultId,
        performedBy: options?.performedBy ?? '',
        auditType: options?.auditType,
        forceNew: options?.forceNew ?? false,
      }),
    })
  },
  saveAuditDraft(
    auditId: string,
    data: {
      lineItems: {
        id: string
        sessionQty?: number | null
        currentCount?: number | null
        discrepancyNotes?: string
      }[]
      notes?: string
      performedBy?: string
    }
  ): Promise<AuditSession> {
    return request(`/audits/${auditId}/lines/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
  completeAudit(
    auditId: string,
    data: {
      lineItems: {
        id: string
        sessionQty?: number | null
        currentCount?: number | null
        discrepancyNotes?: string
      }[]
      notes?: string
      performedBy?: string
    }
  ): Promise<AuditSession> {
    return request(`/audits/${auditId}/complete/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
  cancelAudit(
    auditId: string,
    data?: { performedBy?: string; notes?: string }
  ): Promise<AuditSession> {
    return request(`/audits/${auditId}/cancel/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data ?? {}),
    })
  },

  async getAuditReports(vaultId?: string): Promise<AuditReport[]> {
    const q = vaultId ? `?vault=${vaultId}` : ''
    return unwrap(await request<AuditReport[] | Paginated<AuditReport>>(`/audit-reports/${q}`))
  },

  async getSecrets(opts?: { vault?: string; site?: string }): Promise<Secret[]> {
    const search = new URLSearchParams()
    if (opts?.vault) search.set('vault', opts.vault)
    if (opts?.site) search.set('site', opts.site)
    const q = search.toString() ? `?${search}` : ''
    return unwrap(await request<Secret[] | Paginated<Secret>>(`/secrets/${q}`))
  },
  getSecret(id: string, reveal = false): Promise<Secret> {
    const q = reveal ? '?reveal=true' : ''
    return request(`/secrets/${id}/${q}`)
  },
  createSecret(data: Partial<Secret> & { label: string; content?: string }): Promise<Secret> {
    return request('/secrets/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
  updateSecret(id: string, data: Partial<Secret> & { content?: string }): Promise<Secret> {
    return request(`/secrets/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
  deleteSecret(id: string): Promise<void> {
    return request(`/secrets/${id}/`, { method: 'DELETE' })
  },
  uploadSecretAttachment(secretId: string, file: File, attachmentType = 'document'): Promise<SecretAttachment> {
    const form = new FormData()
    form.append('file', file)
    form.append('attachmentType', attachmentType)
    return requestForm(`/secrets/${secretId}/upload/`, form)
  },

  getNotifications(): Promise<InboxNotification[]> {
    return request('/notifications/')
  },
  dismissNotification(id: string): Promise<void> {
    return request(`/notifications/${id}/dismiss/`, { method: 'POST' })
  },
  clearNotifications(): Promise<{ cleared: number }> {
    return request('/notifications/clear/', { method: 'POST' })
  },
  evaluateNotifications(): Promise<Record<string, number>> {
    return request('/notifications/evaluate/', { method: 'POST' })
  },

  getMarketAlerts(): Promise<InstrumentMarketAlertList> {
    return request('/market-alerts/')
  },

  getMarketAlert(type: string, symbol: string): Promise<InstrumentMarketAlert> {
    return request(`/market-alerts/${type}/${encodeURIComponent(symbol)}/`)
  },

  updateMarketAlert(
    type: string,
    symbol: string,
    data: Partial<MarketAlertConfig>
  ): Promise<InstrumentMarketAlert> {
    return request(`/market-alerts/${type}/${encodeURIComponent(symbol)}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
}

export { ApiError }