import type { NotificationPreferencesResponse } from '../types/notifications'
import { authFetch } from './authFetch'

export type VaultBoxRole =
  | 'full_admin'
  | 'site_admin'
  | 'vault_admin'
  | 'viewer'
  | 'audit_reporting'

export interface UserPermissions {
  globalRole: VaultBoxRole | null
  siteRoles: Record<string, VaultBoxRole>
  vaultRoles: Record<string, VaultBoxRole>
  isFullAdmin: boolean
  canManageUsers: boolean
  canAccessAdmin: boolean
  canViewReports: boolean
  canEditMarketAlerts: boolean
}

export interface AuthUser {
  id: number
  username: string
  email: string
  displayName: string
  phone: string
  theme: 'light' | 'dark' | 'system'
  hasPasskey: boolean
  passkeyCount: number
  permissions: UserPermissions
}

export interface PasskeyInfo {
  id: string
  name: string
  rpId?: string
  createdAt: string
  lastUsedAt: string | null
}

export interface ApiTokenInfo {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  token?: string
}

export interface RoleAssignment {
  userId: number
  globalRole: VaultBoxRole | null
  siteRoles: { id: string; siteId: string; siteName: string; role: VaultBoxRole }[]
  vaultRoles: { id: string; vaultId: string; vaultName: string; siteId: string; role: VaultBoxRole }[]
}

export interface OAuthProvider {
  id: string
  name: string
  enabled: boolean
}

export interface OAuthIdentity {
  id: string
  provider: string
  providerName: string
  email: string
  displayName: string
  linkedAt: string
}

class AuthApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(`/api/auth${path}`, options)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new AuthApiError(text || res.statusText, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const authApi = {
  me(): Promise<AuthUser> {
    return request('/me/')
  },

  logout(): Promise<{ ok: boolean }> {
    return request('/logout/', { method: 'POST' })
  },

  passkeyLoginBegin(username: string): Promise<Record<string, unknown>> {
    return request('/passkey/login/begin/', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
  },

  passkeyLoginFinish(credential: Record<string, unknown>): Promise<{ ok: boolean; username: string }> {
    return request('/passkey/login/finish/', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })
  },

  bootstrapBegin(): Promise<{
    options: Record<string, unknown>
    username: string
    reason?: 'first_boot' | 'rp_id_change'
    rpId?: string
  }> {
    return request('/passkey/bootstrap/begin/', { method: 'POST' })
  },

  bootstrapFinish(credential: Record<string, unknown>, name?: string): Promise<{ ok: boolean; username: string }> {
    return request('/passkey/bootstrap/finish/', {
      method: 'POST',
      body: JSON.stringify({ credential, name }),
    })
  },

  passkeyRegisterBegin(): Promise<Record<string, unknown>> {
    return request('/passkey/register/begin/', { method: 'POST' })
  },

  passkeyRegisterFinish(credential: Record<string, unknown>, name: string): Promise<PasskeyInfo> {
    return request('/passkey/register/finish/', {
      method: 'POST',
      body: JSON.stringify({ credential, name }),
    })
  },

  listPasskeys(): Promise<PasskeyInfo[]> {
    return request('/passkeys/')
  },

  deletePasskey(id: string): Promise<void> {
    return request(`/passkeys/${id}/`, { method: 'DELETE' })
  },

  listTokens(): Promise<ApiTokenInfo[]> {
    return request('/tokens/')
  },

  createToken(name: string): Promise<ApiTokenInfo> {
    return request('/tokens/', { method: 'POST', body: JSON.stringify({ name }) })
  },

  revokeToken(id: string): Promise<void> {
    return request(`/tokens/${id}/`, { method: 'DELETE' })
  },

  getSettings(): Promise<{ theme: string; displayName: string; phone: string; email: string }> {
    return request('/settings/')
  },

  updateSettings(data: Partial<{ theme: string; displayName: string; phone: string; email: string }>): Promise<{ theme: string; displayName: string; phone: string; email: string }> {
    return request('/settings/', { method: 'PATCH', body: JSON.stringify(data) })
  },

  getOAuthProviders(): Promise<OAuthProvider[]> {
    return request('/oauth/providers/')
  },

  listOAuthIdentities(): Promise<OAuthIdentity[]> {
    return request('/oauth/identities/')
  },

  unlinkOAuthIdentity(id: string): Promise<void> {
    return request(`/oauth/identities/${id}/`, { method: 'DELETE' })
  },

  getRoleAssignment(userId: number): Promise<RoleAssignment> {
    return request(`/user-roles/${userId}/`)
  },

  updateRoleAssignment(userId: number, data: {
    globalRole?: VaultBoxRole | null
    siteRoles?: { siteId: string; role: VaultBoxRole }[]
    vaultRoles?: { vaultId: string; role: VaultBoxRole }[]
  }): Promise<RoleAssignment> {
    return request(`/user-roles/${userId}/`, { method: 'PUT', body: JSON.stringify(data) })
  },

  signup(data: { username: string; email: string; displayName?: string; message?: string }): Promise<{ id: string; status: string }> {
    return request('/signup/', { method: 'POST', body: JSON.stringify(data) })
  },

  validateSetupToken(token: string): Promise<{ username: string; email: string; valid: boolean }> {
    return request(`/setup-passkey/validate/?token=${encodeURIComponent(token)}`)
  },

  setupPasskeyBegin(token: string): Promise<{ options: Record<string, unknown>; username: string }> {
    return request('/setup-passkey/begin/', { method: 'POST', body: JSON.stringify({ token }) })
  },

  setupPasskeyFinish(token: string, credential: Record<string, unknown>, name?: string): Promise<{ ok: boolean; username: string }> {
    return request('/setup-passkey/finish/', { method: 'POST', body: JSON.stringify({ token, credential, name }) })
  },

  listSignupRequests(status?: string): Promise<SignupRequestInfo[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : ''
    return request(`/signup-requests/${q}`)
  },

  approveSignup(id: string, data?: { globalRole?: VaultBoxRole; reviewNotes?: string }): Promise<{ setupUrl: string; setupToken: string }> {
    return request(`/signup-requests/${id}/approve/`, { method: 'POST', body: JSON.stringify(data ?? {}) })
  },

  rejectSignup(id: string, reviewNotes?: string): Promise<unknown> {
    return request(`/signup-requests/${id}/reject/`, { method: 'POST', body: JSON.stringify({ reviewNotes }) })
  },

  listRoles(): Promise<RoleDefinition[]> {
    return request('/roles/')
  },

  createRole(data: Partial<RoleDefinition>): Promise<RoleDefinition> {
    return request('/roles/', { method: 'POST', body: JSON.stringify(data) })
  },

  updateRole(id: string, data: Partial<RoleDefinition>): Promise<RoleDefinition> {
    return request(`/roles/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
  },

  deleteRole(id: string): Promise<void> {
    return request(`/roles/${id}/`, { method: 'DELETE' })
  },

  listPermissionCatalog(): Promise<{ key: string; label: string }[]> {
    return request('/permissions/')
  },

  listUserGroups(): Promise<UserGroupInfo[]> {
    return request('/groups/')
  },

  createUserGroup(data: Partial<UserGroupInfo>): Promise<UserGroupInfo> {
    return request('/groups/', { method: 'POST', body: JSON.stringify(data) })
  },

  updateUserGroup(id: string, data: Partial<UserGroupInfo>): Promise<UserGroupInfo> {
    return request(`/groups/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
  },

  deleteUserGroup(id: string): Promise<void> {
    return request(`/groups/${id}/`, { method: 'DELETE' })
  },

  getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
    return request('/notification-preferences/')
  },

  updateNotificationPreferences(data: {
    appriseUrls?: string[]
    preferences?: Array<{
      eventType: string
      enabled?: boolean | null
      inApp?: boolean | null
      email?: boolean | null
      apprise?: boolean | null
      threshold?: number | null
      refireIntervalHours?: number | null
    }>
  }): Promise<NotificationPreferencesResponse> {
    return request('/notification-preferences/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  testAppriseNotification(appriseUrls?: string[]): Promise<AppriseTestResult> {
    return request('/notification-preferences/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'test-apprise',
        ...(appriseUrls != null ? { appriseUrls } : {}),
      }),
    })
  },

  testNotifications(opts?: {
    channels?: ('inApp' | 'email' | 'apprise')[]
    appriseUrls?: string[]
  }): Promise<NotificationTestResult> {
    return request('/notification-preferences/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'test-notifications',
        ...(opts?.channels ? { channels: opts.channels } : {}),
        ...(opts?.appriseUrls != null ? { appriseUrls: opts.appriseUrls } : {}),
      }),
    })
  },
}

export interface NotificationChannelTestResult {
  skipped: boolean
  ok: boolean
  error: string | null
  detail?: string | null
  results?: { url: string; ok: boolean; error: string | null }[]
}

export interface NotificationTestResult {
  sent: boolean
  inApp: NotificationChannelTestResult
  email: NotificationChannelTestResult
  apprise: NotificationChannelTestResult
}

export interface AppriseTestResult {
  sent: boolean
  error?: string
  results: { url: string; ok: boolean; error: string | null }[]
}

export interface SignupRequestInfo {
  id: string
  username: string
  email: string
  displayName: string
  message: string
  status: string
  createdAt: string
}

export interface RoleDefinition {
  id: string
  name: string
  slug: string
  description: string
  permissions: string[]
  isSystem: boolean
}

export interface UserGroupInfo {
  id: string
  name: string
  description: string
  roleId: string
  roleName: string
  memberIds: number[]
  siteIds: string[]
  vaultIds: string[]
  isActive: boolean
}

export { AuthApiError }