import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Globe, Save } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import type { HostnameSource, SiteConfig, UseHttpsSource } from '../../types/site'
import { Card, CardHeader } from '../../components/ui/Card'
import { FormField, inputClass } from '../../components/ui/FormField'

const HOST_SOURCE: Record<HostnameSource, string> = {
  admin: 'Admin override',
  env: '.env (VAULTBOX_HOSTNAME)',
  request: 'This request',
  system: 'Server hostname',
}

const HTTPS_SOURCE: Record<UseHttpsSource, string> = {
  admin: 'Admin override',
  env: '.env (VAULTBOX_USE_HTTPS)',
  default: 'Default (HTTP)',
}

function rpIdFor(hostname: string): string {
  const host = hostname.trim().toLowerCase()
  if (!host || host === '127.0.0.1' || host === '::1') return 'localhost'
  return host.split(':')[0]
}

export function SiteSettingsPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [hostname, setHostname] = useState('')
  const [useHttps, setUseHttps] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [enrollAfterChange, setEnrollAfterChange] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getSiteConfig()
      setConfig(data)
      setHostname(data.hostname)
      setUseHttps(data.useHttps)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load site settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const draftRpId = useMemo(() => {
    const override = hostname.trim()
    if (override) return rpIdFor(override)
    if (config?.envHostname) return rpIdFor(config.envHostname)
    if (config?.requestHostname) return rpIdFor(config.requestHostname)
    if (config?.detectedHostname) return rpIdFor(config.detectedHostname)
    return 'localhost'
  }, [hostname, config])

  const rpIdWillChange = Boolean(config && draftRpId !== config.webauthnRpId)

  const save = async () => {
    if (rpIdWillChange) {
      const ok = window.confirm(
        `This changes the passkey RP ID from "${config?.webauthnRpId}" to "${draftRpId}".\n\nExisting passkeys will not work at the new host — including yours. After save, open the new App URL and register a new admin passkey (login will offer bootstrap). Keep this session open until that succeeds if you may need to revert.\n\nContinue?`,
      )
      if (!ok) return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    setEnrollAfterChange(null)
    try {
      const updated = await adminApi.updateSiteConfig({
        hostname: hostname.trim(),
        useHttps,
      })
      setConfig(updated)
      setHostname(updated.hostname)
      setUseHttps(updated.useHttps)
      if (rpIdWillChange) {
        const loginUrl = `${updated.frontendBaseUrl.replace(/\/$/, '')}/login`
        setEnrollAfterChange(loginUrl)
        setSuccess(null)
      } else {
        setSuccess('Hostname saved. Restart Django after changing .env; reverse proxies may also need a restart.')
        setTimeout(() => setSuccess(null), 8000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const useEnv = () => {
    setHostname('')
    if (config) setUseHttps(config.envUseHttps)
  }

  const useDetected = () => {
    if (config?.detectedHostname) setHostname(config.detectedHostname)
  }

  const useRequestHost = () => {
    if (config?.requestHostname) setHostname(config.requestHostname)
  }

  if (loading && !config) {
    return <p className="text-sm text-vault-500">Loading site settings…</p>
  }

  const overrideSet = hostname.trim().length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Site & Hostname</h2>
          <p className="text-sm text-vault-500">
            DNS name used for URLs, SSO callbacks, QR codes, and passkeys (WebAuthn RP ID)
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Passkeys are bound to the RP ID. After a hostname change, open the new App URL and{' '}
        <strong>register a new admin passkey</strong> (login offers bootstrap because this host has no keys yet).
        Old passkeys keep working only if you revert to the previous host. Keep this session open until the new key
        is enrolled if you may need to revert.
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      {enrollAfterChange && (
        <div className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-vault-900 dark:text-vault-100">
          <p className="font-semibold">Enroll a passkey at the new host before you sign out</p>
          <p className="mt-1">
            This session still works here. Existing passkeys will not authenticate at the new RP ID.
            Open this URL on the new hostname and register an admin passkey:
          </p>
          <p className="mt-2 break-all font-mono text-gold-700 dark:text-gold-300">{enrollAfterChange}</p>
          <p className="mt-2 text-xs text-vault-600 dark:text-vault-400">
            Login will show “Register Admin Passkey” until this host has a key. Other users enroll from Settings after
            an admin signs in, or via a setup-passkey link.
          </p>
        </div>
      )}

      {config && (
        <Card>
          <CardHeader
            title="Boot defaults (.env)"
            subtitle="Applied when Django starts. Restart the backend after editing .env."
          />
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase text-vault-500">VAULTBOX_HOSTNAME</dt>
              <dd className="font-mono text-vault-900">
                {config.envHostname || <span className="text-vault-500">(not set — localhost)</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-vault-500">VAULTBOX_USE_HTTPS</dt>
              <dd className="font-mono text-vault-900">{config.envUseHttps ? 'true' : 'false'}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Admin override"
          subtitle="Leave hostname blank to use .env, then this request, then the server hostname"
        />
        <div className="space-y-4">
          <FormField
            label="Hostname / SAN"
            help="Examples: vaultbox.home.arpa, vault.example.com, localhost. Do not include https:// or a port."
          >
            <input
              className={inputClass}
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder={config?.envHostname || config?.detectedHostname || 'localhost'}
            />
          </FormField>

          <div className="flex flex-wrap gap-2 text-xs">
            {config?.envHostname && (
              <button type="button" onClick={useEnv} className="rounded-md border border-vault-200 px-2.5 py-1 hover:bg-vault-50">
                Use .env ({config.envHostname})
              </button>
            )}
            {config?.detectedHostname && (
              <button type="button" onClick={useDetected} className="rounded-md border border-vault-200 px-2.5 py-1 hover:bg-vault-50">
                Use server hostname ({config.detectedHostname})
              </button>
            )}
            {config?.requestHostname && config.requestHostname !== config.detectedHostname && (
              <button type="button" onClick={useRequestHost} className="rounded-md border border-vault-200 px-2.5 py-1 hover:bg-vault-50">
                Use current request host ({config.requestHostname})
              </button>
            )}
          </div>

          <label className={`flex items-center gap-2 text-sm text-vault-700 ${overrideSet ? '' : 'opacity-60'}`}>
            <input
              type="checkbox"
              checked={overrideSet ? useHttps : Boolean(config?.envUseHttps)}
              disabled={!overrideSet}
              onChange={(e) => setUseHttps(e.target.checked)}
            />
            Use HTTPS for generated public URLs
            {!overrideSet && <span className="text-xs text-vault-500">(follows .env until you set an override hostname)</span>}
          </label>

          {rpIdWillChange && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Saving will change passkey RP ID from <code className="font-mono">{config?.webauthnRpId}</code> to{' '}
              <code className="font-mono">{draftRpId}</code>. Users must re-register passkeys.
            </p>
          )}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save hostname'}
          </button>
        </div>
      </Card>

      {config && (
        <Card>
          <CardHeader title="Effective (what passkeys use)" subtitle="Open the App URL in the browser. Register these with your IdP and reverse proxy." />
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-vault-400" />
              <div className="min-w-0 space-y-2">
                <p className="text-vault-600">
                  Effective hostname: <span className="font-mono text-vault-900">{config.effectiveHostname}</span>
                  {' '}
                  <span className="text-vault-500">({HOST_SOURCE[config.hostnameSource]})</span>
                  {config.isDevHostname && <span className="text-vault-500"> · dev ports</span>}
                </p>
                <p className="text-vault-600">
                  HTTPS: <span className="font-mono text-vault-900">{config.useHttps ? 'true' : 'false'}</span>
                  {' '}
                  <span className="text-vault-500">({HTTPS_SOURCE[config.useHttpsSource]})</span>
                </p>
                <p className="break-all text-vault-600">
                  App URL: <span className="font-mono text-vault-900">{config.frontendBaseUrl}</span>
                </p>
                <p className="break-all text-vault-600">
                  API / SSO callback base: <span className="font-mono text-vault-900">{config.backendBaseUrl}</span>
                </p>
                <p className="break-all text-vault-600">
                  Passkey RP ID: <span className="font-mono text-vault-900">{config.webauthnRpId}</span>
                </p>
                <p className="break-all text-vault-600">
                  Passkey origin: <span className="font-mono text-vault-900">{config.webauthnOrigin}</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-vault-500">
              Custom hostnames use ports 80/443 (put a reverse proxy in front). Localhost keeps Vite 5173 and Django 8000.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
