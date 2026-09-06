import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Fingerprint, Key, Link2, Moon, Shield, Sun, Trash2 } from 'lucide-react'
import { authApi, type ApiTokenInfo, type OAuthIdentity, type OAuthProvider, type PasskeyInfo } from '../lib/authApi'
import { useAuth } from '../context/AuthContext'
import { applyTheme, type ThemePreference } from '../lib/theme'
import { NotificationAlertsCard } from '../components/settings/NotificationAlertsCard'
import { Card, CardHeader } from '../components/ui/Card'
import { FormField, inputClass } from '../components/ui/FormField'

export function UserSettingsPage() {
  const { user, refresh } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [theme, setTheme] = useState<ThemePreference>('light')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [tokens, setTokens] = useState<ApiTokenInfo[]>([])
  const [newPasskeyName, setNewPasskeyName] = useState('New Passkey')
  const [newTokenName, setNewTokenName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([])
  const [oauthIdentities, setOauthIdentities] = useState<OAuthIdentity[]>([])
  const [ssoSuccess, setSsoSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [settings, pk, tk, providers, identities] = await Promise.all([
        authApi.getSettings(),
        authApi.listPasskeys(),
        authApi.listTokens(),
        authApi.getOAuthProviders().catch(() => []),
        authApi.listOAuthIdentities().catch(() => []),
      ])
      setTheme(settings.theme as ThemePreference)
      setDisplayName(settings.displayName)
      setEmail(settings.email ?? '')
      setPhone(settings.phone)
      setPasskeys(pk)
      setTokens(tk)
      setOauthProviders(providers)
      setOauthIdentities(identities)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (searchParams.get('oauth_linked') === '1') {
      setSsoSuccess('SSO account linked successfully.')
      void load()
      const next = new URLSearchParams(searchParams)
      next.delete('oauth_linked')
      setSearchParams(next, { replace: true })
    }
    const oauthError = searchParams.get('oauth_error')
    if (oauthError) {
      setError(decodeURIComponent(oauthError))
      const next = new URLSearchParams(searchParams)
      next.delete('oauth_error')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, load])

  const linkedProviderIds = new Set(oauthIdentities.map((i) => i.provider))
  const availableProviders = oauthProviders.filter((p) => !linkedProviderIds.has(p.id))

  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      await authApi.updateSettings({ theme, displayName, email: email.trim(), phone })
      applyTheme(theme)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const registerPasskey = async () => {
    setError(null)
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const options = await authApi.passkeyRegisterBegin()
      const credential = await startRegistration({ optionsJSON: options as never })
      await authApi.passkeyRegisterFinish(credential as never, newPasskeyName)
      await load()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Passkey registration failed')
    }
  }

  const removePasskey = async (pk: PasskeyInfo) => {
    const isLast = passkeys.length <= 1
    const message = isLast
      ? 'Remove your only passkey? VaultBox requires at least one passkey per user and always keeps a Full Admin passkey in the system.'
      : `Remove passkey "${pk.name}"? Full Admins cannot delete the last admin passkey in the system.`
    if (!window.confirm(message)) return
    setError(null)
    try {
      await authApi.deletePasskey(pk.id)
      await load()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove passkey')
    }
  }

  const createToken = async () => {
    if (!newTokenName.trim()) return
    setError(null)
    try {
      const token = await authApi.createToken(newTokenName.trim())
      setCreatedToken(token.token ?? null)
      setNewTokenName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Token creation failed')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-vault-900 dark:text-white">User Settings</h2>
        <p className="text-sm text-vault-600 dark:text-vault-400">Signed in as {user?.username}</p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}
      {ssoSuccess && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{ssoSuccess}</p>
      )}

      <Card>
        <CardHeader title="Appearance" />
        <div className="space-y-4">
          <FormField label="Theme">
            <div className="flex gap-2">
              {([
                ['light', Sun, 'Light'],
                ['dark', Moon, 'Dark'],
                ['system', Sun, 'System'],
              ] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTheme(value)
                    applyTheme(value)
                  }}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    theme === value
                      ? 'border-gold-500 bg-gold-500/10 text-vault-900 dark:text-white'
                      : 'border-vault-200 text-vault-600 dark:border-vault-600 dark:text-vault-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Display name">
            <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </FormField>
          <FormField label="Email address" required>
            <input
              type="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="mt-1 text-xs text-vault-500 dark:text-vault-400">
              Notification emails are delivered to this address when email alerts are enabled.
            </p>
          </FormField>
          <FormField label="Phone">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving || !email.trim()}
            className="rounded-md bg-vault-800 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700 disabled:opacity-50 dark:bg-vault-600"
          >
            Save preferences
          </button>
        </div>
      </Card>

      <NotificationAlertsCard />

      {(oauthProviders.length > 0 || oauthIdentities.length > 0) && (
        <Card>
          <CardHeader title="SSO Accounts" subtitle="Link an identity provider to sign in with SSO in addition to your passkey" />
          <div className="space-y-4">
            <ul className="divide-y divide-vault-100 dark:divide-vault-700">
              {oauthIdentities.map((identity) => (
                <li key={identity.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-vault-400" />
                    <div>
                      <p className="font-medium text-vault-900 dark:text-white">{identity.providerName}</p>
                      <p className="text-xs text-vault-500">
                        {identity.email || identity.displayName || identity.provider}
                        {' · '}Linked {new Date(identity.linkedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Unlink ${identity.providerName}?`)) return
                      setError(null)
                      try {
                        await authApi.unlinkOAuthIdentity(identity.id)
                        await load()
                        setSsoSuccess(`${identity.providerName} unlinked.`)
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to unlink SSO account')
                      }
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Unlink
                  </button>
                </li>
              ))}
              {oauthIdentities.length === 0 && (
                <li className="py-3 text-sm text-vault-500">No SSO accounts linked yet.</li>
              )}
            </ul>
            {availableProviders.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-vault-100 pt-4 dark:border-vault-700">
                {availableProviders.map((provider) => (
                  <a
                    key={provider.id}
                    href={`/api/auth/oauth/${provider.id}/link/?next=${encodeURIComponent('/settings')}`}
                    className="inline-flex items-center gap-2 rounded-md border border-vault-200 px-3 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50 dark:border-vault-600 dark:text-vault-200 dark:hover:bg-vault-800"
                  >
                    <Link2 className="h-4 w-4" />
                    Link {provider.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Passkey Management" />
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              placeholder="Passkey name"
            />
            <button
              type="button"
              onClick={registerPasskey}
              className="flex shrink-0 items-center gap-2 rounded-md border border-vault-200 px-3 py-2 text-sm hover:bg-vault-50 dark:border-vault-600 dark:hover:bg-vault-800"
            >
              <Fingerprint className="h-4 w-4" />
              Add Passkey
            </button>
          </div>
          <ul className="divide-y divide-vault-100 dark:divide-vault-700">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-vault-900 dark:text-white">{pk.name}</p>
                  <p className="text-xs text-vault-500">
                    Added {new Date(pk.createdAt).toLocaleDateString()}
                    {pk.lastUsedAt && ` · Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                    {pk.rpId && ` · host ${pk.rpId}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePasskey(pk)}
                  className="text-vault-400 hover:text-red-500"
                  title="Remove passkey"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {passkeys.length === 0 && <li className="py-3 text-sm text-vault-500">No passkeys registered.</li>}
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader title="API Token Management" />
        <div className="space-y-4">
          <p className="text-sm text-vault-500">
            Create bearer tokens for programmatic API access. Tokens are shown once at creation.
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Token name (e.g. CLI, Integration)"
            />
            <button
              type="button"
              onClick={createToken}
              className="flex shrink-0 items-center gap-2 rounded-md bg-vault-800 px-3 py-2 text-sm text-white hover:bg-vault-700 dark:bg-vault-600"
            >
              <Key className="h-4 w-4" />
              Create
            </button>
          </div>
          {createdToken && (
            <div className="rounded-md border border-gold-500/40 bg-gold-500/10 p-3 text-sm">
              <p className="font-medium text-vault-900 dark:text-white">Copy your token now — it won&apos;t be shown again:</p>
              <code className="mt-2 block break-all font-mono text-xs">{createdToken}</code>
            </div>
          )}
          <ul className="divide-y divide-vault-100 dark:divide-vault-700">
            {tokens.filter((t) => t.isActive).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-vault-900 dark:text-white">{t.name}</p>
                  <p className="font-mono text-xs text-vault-500">{t.prefix}…</p>
                </div>
                <button
                  type="button"
                  onClick={async () => { await authApi.revokeToken(t.id); await load() }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
            {tokens.filter((t) => t.isActive).length === 0 && (
              <li className="py-3 text-sm text-vault-500">No active API tokens.</li>
            )}
          </ul>
        </div>
      </Card>
    </div>
  )
}