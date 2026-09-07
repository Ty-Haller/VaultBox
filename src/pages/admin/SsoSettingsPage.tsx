import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, Plus, Shield } from 'lucide-react'
import { SsoProviderModal } from '../../components/admin/SsoProviderModal'
import { Badge } from '../../components/ui/Badge'
import { Card, CardHeader } from '../../components/ui/Card'
import { adminApi } from '../../lib/adminApi'
import type { SsoConfig, SsoProvider, SsoProviderDraft } from '../../types/sso'
import { useDemo } from '../../context/DemoContext'

function toDraft(p: SsoProvider): SsoProviderDraft {
  return {
    id: p.id,
    name: p.name,
    enabled: p.enabled,
    type: p.type,
    clientId: p.clientId,
    authorizeUrl: p.authorizeUrl,
    tokenUrl: p.tokenUrl,
    userinfoUrl: p.userinfoUrl,
    scope: p.scope,
    redirectUri: p.redirectUri,
    clientSecret: p.hasClientSecret ? '********' : '',
  }
}

export function SsoSettingsPage() {
  const { publicDemo } = useDemo()
  const [config, setConfig] = useState<SsoConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SsoProvider | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setConfig(await adminApi.getSsoConfig())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load SSO settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveProviders = async (providers: SsoProviderDraft[]) => {
    if (publicDemo) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await adminApi.updateSsoConfig({ providers })
      setConfig(updated)
      setSuccess('SSO settings saved')
      setTimeout(() => setSuccess(null), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProvider = (draft: SsoProviderDraft) => {
    if (!config) return
    const others = config.providers.filter((p) => p.id !== draft.id).map(toDraft)
    void saveProviders([...others, draft])
  }

  const toggleEnabled = (id: string, enabled: boolean) => {
    if (!config) return
    void saveProviders(config.providers.map((p) => (p.id === id ? { ...toDraft(p), enabled } : toDraft(p))))
  }

  const removeProvider = (id: string) => {
    if (!config || !confirm('Remove this SSO provider?')) return
    void saveProviders(config.providers.filter((p) => p.id !== id).map(toDraft))
  }

  if (loading && !config) {
    return <p className="text-sm text-vault-500">Loading SSO settings…</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">SSO / OAuth</h2>
          <p className="text-sm text-vault-500">Configure OpenID Connect providers for Login with SSO</p>
        </div>
      </div>

      {publicDemo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Public demo locks SSO / OAuth. Visitors use the demo admin session or a passkey; adding identity providers would affect everyone on this shared box.
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <Card>
        <CardHeader
          title="Passkey authentication"
          subtitle="Always available — SSO supplements but does not replace passkeys"
        />
        <div className="flex items-start gap-3 text-sm text-vault-600">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-vault-400" />
          <p>
            Users can always sign in with a registered passkey. SSO creates or links accounts on first login;
            users should register a passkey in Settings for passwordless backup access.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="OAuth providers"
          subtitle="Enabled providers appear on the login page as Login with SSO"
          action={
            <button
              type="button"
              onClick={() => { setEditing(null); setModalOpen(true) }}
              disabled={publicDemo}
              className="flex items-center gap-1.5 rounded-md border border-vault-200 px-3 py-1.5 text-sm hover:bg-vault-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add provider
            </button>
          }
        />

        {config && (
          <p className="mb-4 font-mono text-xs text-vault-500">
            Callback URL pattern: {config.callbackUrlTemplate}
          </p>
        )}

        {!config || config.providers.length === 0 ? (
          <p className="text-sm text-vault-500">No SSO providers configured. Add one to enable Login with SSO.</p>
        ) : (
          <div className="space-y-3">
            {config.providers.map((provider) => (
              <div
                key={provider.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vault-200 px-4 py-3 dark:border-vault-700"
              >
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-vault-400" />
                  <div>
                    <p className="font-medium text-vault-900">{provider.name}</p>
                    <p className="font-mono text-xs text-vault-500">{provider.id} · {provider.type}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={provider.enabled ? 'success' : 'default'}>
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {provider.hasClientSecret && <Badge variant="info">Secret set</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-vault-600">
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      disabled={saving || publicDemo}
                      onChange={(e) => toggleEnabled(provider.id, e.target.checked)}
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => { setEditing(provider); setModalOpen(true) }}
                    disabled={publicDemo}
                    className="rounded-md border border-vault-200 px-3 py-1.5 text-xs hover:bg-vault-50 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProvider(provider.id)}
                    disabled={saving || publicDemo}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {config && (
        <SsoProviderModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSave={handleSaveProvider}
          initial={editing}
          callbackUrlTemplate={config.callbackUrlTemplate}
        />
      )}
    </div>
  )
}