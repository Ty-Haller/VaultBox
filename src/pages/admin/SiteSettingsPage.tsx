import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Globe, Save } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import type { SiteConfig } from '../../types/site'
import { Card, CardHeader } from '../../components/ui/Card'
import { FormField, inputClass } from '../../components/ui/FormField'

export function SiteSettingsPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [hostname, setHostname] = useState('')
  const [useHttps, setUseHttps] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await adminApi.updateSiteConfig({
        hostname: hostname.trim(),
        useHttps,
      })
      setConfig(updated)
      setHostname(updated.hostname)
      setUseHttps(updated.useHttps)
      setSuccess('Site hostname saved. Restart may be required for reverse-proxy deployments.')
      setTimeout(() => setSuccess(null), 6000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const useDetected = () => {
    if (config?.detectedHostname) setHostname('')
  }

  const useRequestHost = () => {
    if (config?.requestHostname) setHostname(config.requestHostname)
  }

  if (loading && !config) {
    return <p className="text-sm text-vault-500">Loading site settings…</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Site & Hostname</h2>
          <p className="text-sm text-vault-500">Public DNS name or SAN used for URLs, SSO callbacks, QR codes, and passkeys</p>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <Card>
        <CardHeader title="Public hostname" subtitle="Leave blank to use the server hostname automatically" />
        <div className="space-y-4">
          <FormField
            label="Hostname / SAN"
            help="Examples: vaultbox.home.arpa, vault.example.com, localhost (dev). Do not include https:// or port."
          >
            <input
              className={inputClass}
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder={config?.detectedHostname ?? 'hostname'}
            />
          </FormField>

          <div className="flex flex-wrap gap-2 text-xs">
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

          <label className="flex items-center gap-2 text-sm text-vault-700">
            <input type="checkbox" checked={useHttps} onChange={(e) => setUseHttps(e.target.checked)} />
            Use HTTPS for generated public URLs
          </label>

          <button
            type="button"
            onClick={save}
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
          <CardHeader title="Derived URLs" subtitle="Updated when you save — register these with your IdP and reverse proxy" />
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-vault-400" />
              <div className="min-w-0 space-y-2">
                <p className="text-vault-600">
                  Effective hostname: <span className="font-mono text-vault-900">{config.effectiveHostname}</span>
                  {config.isDevHostname && <span className="text-vault-500"> (dev ports)</span>}
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
              Users must open VaultBox at the app URL above for passkeys to work. Custom hostnames use standard ports (80/443);
              localhost keeps dev ports 5173 / 8000.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}