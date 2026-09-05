import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { Building2, Fingerprint, KeyRound, Shield } from 'lucide-react'
import { authApi, type OAuthProvider } from '../lib/authApi'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, refresh } = useAuth()
  const [username, setUsername] = useState('admin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapMode, setBootstrapMode] = useState(false)
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([])

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  useEffect(() => {
    const oauthError = searchParams.get('oauth_error')
    if (oauthError) setError(decodeURIComponent(oauthError))
    if (searchParams.get('sso_pending') === '1') {
      setError('Your SSO account is pending admin approval. You will be able to sign in once a Full Admin approves your request.')
    }
  }, [searchParams])

  useEffect(() => {
    authApi.getOAuthProviders().then(setOauthProviders).catch(() => {})
    authApi.bootstrapBegin()
      .then(() => setBootstrapMode(true))
      .catch(() => setBootstrapMode(false))
  }, [])

  const handlePasskeyLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const options = await authApi.passkeyLoginBegin(username.trim())
      const credential = await startAuthentication({ optionsJSON: options as never })
      await authApi.passkeyLoginFinish(credential as never)
      await refresh()
      navigate(from, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Passkey login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBootstrap = async () => {
    setLoading(true)
    setError(null)
    try {
      const { options } = await authApi.bootstrapBegin()
      const credential = await startRegistration({ optionsJSON: options as never })
      await authApi.bootstrapFinish(credential as never, 'Admin Passkey')
      await refresh()
      navigate(from, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bootstrap failed')
    } finally {
      setLoading(false)
    }
  }

  const hasSso = oauthProviders.length > 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-vault-50 px-4 dark:bg-vault-950">
      <div className="w-full max-w-md rounded-xl border border-vault-200 bg-white p-8 shadow-lg dark:border-vault-700 dark:bg-vault-900">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-500/20">
            <Building2 className="h-7 w-7 text-gold-400" />
          </div>
          <h1 className="text-xl font-bold text-vault-900 dark:text-white">VaultBox</h1>
          <p className="text-[10px] uppercase tracking-widest text-vault-400">
            Hard Asset Inventory
          </p>
          <p className="text-center text-sm text-vault-500">
            Sign in with your passkey{hasSso ? ' or SSO' : ''}.
          </p>
        </div>

        {bootstrapMode ? (
          <div className="space-y-4">
            <p className="rounded-md bg-gold-500/10 px-3 py-2 text-sm text-gold-600 dark:text-gold-300">
              First-time setup: register an admin passkey to secure VaultBox.
            </p>
            <button
              type="button"
              onClick={handleBootstrap}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-vault-950 hover:bg-gold-400 disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              Register Admin Passkey
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-vault-700 dark:text-vault-200">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-md border border-vault-200 bg-vault-50 px-3 py-2 text-sm dark:border-vault-600 dark:bg-vault-800 dark:text-white"
                autoComplete="username"
              />
            </label>
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={loading || !username.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-vault-700 disabled:opacity-50 dark:bg-vault-600"
            >
              <Fingerprint className="h-4 w-4" />
              Sign in with Passkey
            </button>
          </div>
        )}

        {hasSso && !bootstrapMode && (
          <div className="mt-6 space-y-2">
            <p className="text-center text-xs uppercase tracking-wider text-vault-400">Or</p>
            {oauthProviders.map((p) => (
              <a
                key={p.id}
                href={`/api/auth/oauth/${p.id}/login/?next=${encodeURIComponent(from)}`}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-vault-200 px-4 py-2.5 text-sm font-medium text-vault-700 hover:bg-vault-50 dark:border-vault-600 dark:text-vault-200 dark:hover:bg-vault-800"
              >
                <Shield className="h-4 w-4 text-vault-500" />
                Login with SSO — {p.name}
              </a>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-vault-600 dark:text-vault-400">
          Need access? <a href="/signup" className="text-gold-500 hover:underline">Request an account</a>
        </p>
      </div>
    </div>
  )
}