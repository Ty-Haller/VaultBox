import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { SsoProvider, SsoProviderDraft } from '../../types/sso'
import { SSO_PROVIDER_TEMPLATES, getSsoTemplate } from '../../lib/ssoProviders'
import { Modal } from '../ui/Modal'
import { FormField, inputClass, selectClass } from '../ui/FormField'

interface SsoProviderModalProps {
  open: boolean
  onClose: () => void
  onSave: (provider: SsoProviderDraft) => void
  initial?: SsoProvider | null
  callbackUrlTemplate: string
}

function slugifyId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function SsoProviderModal({ open, onClose, onSave, initial, callbackUrlTemplate }: SsoProviderModalProps) {
  const [type, setType] = useState(initial?.type ?? 'google')
  const [name, setName] = useState(initial?.name ?? '')
  const [id, setId] = useState(initial?.id ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [clientId, setClientId] = useState(initial?.clientId ?? '')
  const [clientSecret, setClientSecret] = useState('')
  const [authorizeUrl, setAuthorizeUrl] = useState(initial?.authorizeUrl ?? '')
  const [tokenUrl, setTokenUrl] = useState(initial?.tokenUrl ?? '')
  const [userinfoUrl, setUserinfoUrl] = useState(initial?.userinfoUrl ?? '')
  const [scope, setScope] = useState(initial?.scope ?? 'openid email profile')
  const [redirectUri, setRedirectUri] = useState(initial?.redirectUri ?? '')
  const [error, setError] = useState<string | null>(null)

  const template = useMemo(() => getSsoTemplate(type), [type])
  const callbackPreview = callbackUrlTemplate.replace('{providerId}', id || slugifyId(name) || 'provider')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setType(initial.type)
      setName(initial.name)
      setId(initial.id)
      setEnabled(initial.enabled)
      setClientId(initial.clientId)
      setClientSecret('')
      setAuthorizeUrl(initial.authorizeUrl)
      setTokenUrl(initial.tokenUrl)
      setUserinfoUrl(initial.userinfoUrl)
      setScope(initial.scope)
      setRedirectUri(initial.redirectUri)
    } else {
      const t = getSsoTemplate('google')
      setType('google')
      setName(t.name)
      setId(slugifyId(t.name))
      setEnabled(true)
      setClientId('')
      setClientSecret('')
      setAuthorizeUrl(t.authorizeUrl)
      setTokenUrl(t.tokenUrl)
      setUserinfoUrl(t.userinfoUrl)
      setScope(t.scope)
      setRedirectUri('')
    }
    setError(null)
  }, [open, initial])

  const applyTemplate = (nextType: typeof type) => {
    const t = getSsoTemplate(nextType)
    setType(nextType)
    if (!initial) {
      setName(t.name)
      setId(slugifyId(t.name))
      setAuthorizeUrl(t.authorizeUrl)
      setTokenUrl(t.tokenUrl)
      setUserinfoUrl(t.userinfoUrl)
      setScope(t.scope)
    }
    setError(null)
  }

  const handleSave = () => {
    const providerId = (id || slugifyId(name)).trim()
    if (!providerId) {
      setError('Provider ID is required')
      return
    }
    if (!name.trim()) {
      setError('Display name is required')
      return
    }
    if (!clientId.trim()) {
      setError('Client ID is required')
      return
    }
    if (!initial?.hasClientSecret && !clientSecret.trim()) {
      setError('Client secret is required')
      return
    }
    if (!authorizeUrl.trim() || !tokenUrl.trim() || !userinfoUrl.trim()) {
      setError('Authorize, token, and userinfo URLs are required')
      return
    }
    onSave({
      id: providerId,
      name: name.trim(),
      enabled,
      type,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim() || (initial?.hasClientSecret ? '********' : ''),
      authorizeUrl: authorizeUrl.trim(),
      tokenUrl: tokenUrl.trim(),
      userinfoUrl: userinfoUrl.trim(),
      scope: scope.trim() || 'openid email profile',
      redirectUri: redirectUri.trim(),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit SSO provider' : 'Add SSO provider'} size="lg">
      <div className="space-y-4">
        <FormField label="Provider template">
          <select className={selectClass} value={type} onChange={(e) => applyTemplate(e.target.value as typeof type)}>
            {SSO_PROVIDER_TEMPLATES.map((t) => (
              <option key={t.type} value={t.type}>{t.name}</option>
            ))}
          </select>
          {template.help && <p className="mt-1 text-xs text-vault-500">{template.help}</p>}
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Display name" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!initial) setId(slugifyId(e.target.value))
              }}
            />
          </FormField>
          <FormField label="Provider ID" required help="Used in callback URL path — lowercase slug.">
            <input className={inputClass} value={id} onChange={(e) => setId(slugifyId(e.target.value))} />
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm text-vault-700">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled (shows Login with SSO)
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Client ID" required>
            <input className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" />
          </FormField>
          <FormField label={initial?.hasClientSecret ? 'Client secret (leave blank to keep)' : 'Client secret'} required={!initial?.hasClientSecret}>
            <input
              type="password"
              className={inputClass}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>
        </div>

        <FormField label="Authorize URL" required>
          <input className={inputClass} value={authorizeUrl} onChange={(e) => setAuthorizeUrl(e.target.value)} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Token URL" required>
            <input className={inputClass} value={tokenUrl} onChange={(e) => setTokenUrl(e.target.value)} />
          </FormField>
          <FormField label="Userinfo URL" required>
            <input className={inputClass} value={userinfoUrl} onChange={(e) => setUserinfoUrl(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Scope">
          <input className={inputClass} value={scope} onChange={(e) => setScope(e.target.value)} />
        </FormField>

        <FormField label="Redirect URI" help="Register this exact URL in your IdP. Leave blank to use the default callback.">
          <input
            className={inputClass}
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            placeholder={callbackPreview}
          />
          <p className="mt-1 font-mono text-xs text-vault-500">{callbackPreview}</p>
        </FormField>

        <a
          href="https://www.oauth.com/oauth2-servers/server-side-apps/pkce/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:underline"
        >
          VaultBox uses OAuth PKCE <ExternalLink className="h-3 w-3" />
        </a>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-vault-200 pt-4 dark:border-vault-700">
          <button type="button" onClick={onClose} className="rounded-md border border-vault-200 px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={handleSave} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-600">
            {initial ? 'Save changes' : 'Add provider'}
          </button>
        </div>
      </div>
    </Modal>
  )
}