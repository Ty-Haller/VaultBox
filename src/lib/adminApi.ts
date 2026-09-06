import type { SiteConfig } from '../types/site'
import type { SsoConfig, SsoProviderDraft } from '../types/sso'
import type {
  BackupRecord,
  BackupRestoreResult,
  BackupSchedule,
  BackupStorageInfo,
  RcloneConfig,
  RcloneRemote,
} from '../types/backups'
import type {
  AdminNotificationCatalogItem,
  RoleNotificationDefault,
  SmtpDeliveryConfig,
} from '../types/notifications'
import { authFetch } from './authFetch'
import { formatApiError } from './apiError'
import { fetchTimeoutSignal } from './fetchTimeout'

const ADMIN_BASE = '/api/admin'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface Paginated<T> {
  results?: T[]
}

function unwrap<T>(data: T[] | Paginated<T>): T[] {
  if (Array.isArray(data)) return data
  return data.results ?? []
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(`${ADMIN_BASE}${path}`, {
    headers: { Accept: 'application/json', ...options?.headers as Record<string, string> },
    signal: fetchTimeoutSignal(15000),
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(formatApiError(text, res.status), res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const adminApi = {
  async list<T>(resource: string): Promise<T[]> {
    return unwrap(await request<T[] | Paginated<T>>(`/${resource}/`))
  },
  get<T>(resource: string, id: string | number): Promise<T> {
    return request(`/${resource}/${id}/`)
  },
  create<T>(resource: string, data: Record<string, unknown>): Promise<T> {
    return request(`/${resource}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
  update<T>(resource: string, id: string | number, data: Record<string, unknown>): Promise<T> {
    return request(`/${resource}/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
  delete(resource: string, id: string | number): Promise<void> {
    return request(`/${resource}/${id}/`, { method: 'DELETE' })
  },

  getNotificationCatalog(): Promise<AdminNotificationCatalogItem[]> {
    return request('/notification-catalog/')
  },

  resetNotificationDefaults(kind: 'all' | 'catalog' | 'roles' = 'all'): Promise<Record<string, number>> {
    return request('/notification-defaults/reset/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    })
  },

  async listRoleNotificationDefaults(): Promise<RoleNotificationDefault[]> {
    return unwrap(await request<RoleNotificationDefault[] | Paginated<RoleNotificationDefault>>('/role-notification-defaults/'))
  },

  updateRoleNotificationDefault(id: string, data: Partial<RoleNotificationDefault>): Promise<RoleNotificationDefault> {
    return request(`/role-notification-defaults/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  getSmtpDelivery(): Promise<SmtpDeliveryConfig> {
    return request('/notification-delivery/')
  },

  updateSmtpDelivery(data: Partial<SmtpDeliveryConfig & { password?: string }>): Promise<SmtpDeliveryConfig> {
    return request('/notification-delivery/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  testSmtpDelivery(): Promise<{ sent: boolean }> {
    return request('/notification-delivery/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' }),
    })
  },

  listBackups(): Promise<BackupRecord[]> {
    return request('/backups/')
  },

  createBackup(data: {
    includeMedia?: boolean
    encrypt?: boolean
    password?: string
    uploadToRclone?: boolean
    remoteId?: string
  }): Promise<BackupRecord> {
    return request('/backups/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  deleteBackup(id: string): Promise<void> {
    return request(`/backups/${id}/`, { method: 'DELETE' })
  },

  async downloadBackup(id: string): Promise<void> {
    const res = await authFetch(`${ADMIN_BASE}/backups/${id}/download/`, {
      signal: fetchTimeoutSignal(120000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new ApiError(formatApiError(text, res.status), res.status)
    }
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition')
    let filename = 'backup'
    const match = disposition?.match(/filename="?([^";]+)"?/)
    if (match) filename = match[1]
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  },

  restoreBackup(id: string, data: { confirm: string; password?: string }): Promise<BackupRestoreResult> {
    return request(`/backups/${id}/restore/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async restoreBackupUpload(file: File, data: { confirm: string; password?: string }): Promise<BackupRestoreResult> {
    const form = new FormData()
    form.append('file', file)
    form.append('confirm', data.confirm)
    if (data.password) form.append('password', data.password)
    const res = await authFetch(`${ADMIN_BASE}/backups/restore-upload/`, {
      method: 'POST',
      body: form,
      signal: fetchTimeoutSignal(300000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new ApiError(formatApiError(text, res.status), res.status)
    }
    return res.json() as Promise<BackupRestoreResult>
  },

  getBackupSchedule(): Promise<BackupSchedule> {
    return request('/backups/schedule/')
  },

  updateBackupSchedule(data: Partial<BackupSchedule> & { encryptionPassword?: string }): Promise<BackupSchedule> {
    return request('/backups/schedule/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  getBackupRclone(): Promise<RcloneConfig> {
    return request('/backups/rclone/')
  },

  updateBackupRclone(data: { remotes: RcloneRemote[] }): Promise<RcloneConfig> {
    return request('/backups/rclone/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  testBackupRclone(remoteId: string): Promise<{ ok: boolean; error: string | null }> {
    return request('/backups/rclone/test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remoteId }),
    })
  },

  getBackupStorage(): Promise<BackupStorageInfo> {
    return request('/backups/storage/')
  },

  getSiteConfig(): Promise<SiteConfig> {
    return request('/site/')
  },

  getStalePasskeys(): Promise<{
    currentRpId: string
    currentCount: number
    staleCount: number
    staleByRpId: { rpId: string; count: number }[]
    deleted?: number
  }> {
    return request('/stale-passkeys/')
  },

  purgeStalePasskeys(): Promise<{
    currentRpId: string
    currentCount: number
    staleCount: number
    staleByRpId: { rpId: string; count: number }[]
    deleted: number
  }> {
    return request('/stale-passkeys/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'PURGE' }),
    })
  },


  updateSiteConfig(data: { hostname?: string; useHttps?: boolean }): Promise<SiteConfig> {
    return request('/site/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  getSsoConfig(): Promise<SsoConfig> {
    return request('/sso/')
  },

  updateSsoConfig(data: { providers: SsoProviderDraft[] }): Promise<SsoConfig> {
    return request('/sso/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
}

export { ApiError as AdminApiError }