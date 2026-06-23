import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { startRegistration } from '@simplewebauthn/browser'
import { Fingerprint } from 'lucide-react'
import { authApi } from '../lib/authApi'
import { useAuth } from '../context/AuthContext'
import { ensureLocalhostForWebAuthn } from '../lib/webauthnHost'

export function SetupPasskeyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const token = params.get('token') ?? ''
  const [username, setUsername] = useState('')
  const [valid, setValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ensureLocalhostForWebAuthn()
    if (!token) {
      setError('Missing setup token')
      return
    }
    authApi.validateSetupToken(token).then((r) => {
      setUsername(r.username)
      setValid(true)
    }).catch((e) => setError(e instanceof Error ? e.message : 'Invalid token'))
  }, [token])

  const setup = async () => {
    setLoading(true)
    setError(null)
    try {
      const { options } = await authApi.setupPasskeyBegin(token)
      const credential = await startRegistration({ optionsJSON: options as never })
      await authApi.setupPasskeyFinish(token, credential as never, 'Primary Passkey')
      await refresh()
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-vault-50 px-4 dark:bg-vault-950">
      <div className="w-full max-w-md rounded-xl border border-vault-200 bg-white p-8 shadow-lg dark:border-vault-700 dark:bg-vault-900">
        <h1 className="text-xl font-bold text-vault-900 dark:text-white">Set up your passkey</h1>
        {valid && <p className="mt-2 text-sm text-vault-600 dark:text-vault-400">Account: <strong>{username}</strong></p>}
        <p className="mt-4 text-sm text-vault-600 dark:text-vault-400">
          This one-time link lets you register a passkey and sign in. It expires after 7 days.
        </p>
        <button
          type="button"
          onClick={setup}
          disabled={!valid || loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-vault-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-vault-700 disabled:opacity-50 dark:bg-vault-600"
        >
          <Fingerprint className="h-4 w-4" />
          Register passkey
        </button>
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}