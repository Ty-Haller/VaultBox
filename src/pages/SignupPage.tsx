import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { LogoMark } from '../components/brand/LogoMark'
import { authApi } from '../lib/authApi'
import { FormField, inputClass } from '../components/ui/FormField'
import { DemoBanner } from '../components/layout/DemoBanner'
import { useDemo } from '../context/DemoContext'

export function SignupPage() {
  const { publicDemo } = useDemo()
  const [form, setForm] = useState({ username: '', email: '', displayName: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      await authApi.signup(form)
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-vault-50 dark:bg-vault-950">
      <DemoBanner />
      <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-vault-200 bg-white p-8 shadow-lg dark:border-vault-700 dark:bg-vault-900">
        <div className="mb-6 flex flex-col items-center gap-2">
          <LogoMark className="h-14 w-14 rounded-xl" />
          <h1 className="text-xl font-bold text-vault-900 dark:text-white">Request VaultBox Access</h1>
          <p className="text-[10px] uppercase tracking-widest text-vault-400">
            Hard Asset Inventory
          </p>
          <p className="text-center text-sm text-vault-600 dark:text-vault-400">
            Submit a request for a Full Admin to review. If approved, you&apos;ll receive a one-time link to set up your passkey.
          </p>
        </div>

        {publicDemo ? (
          <div className="space-y-3 text-center text-sm text-vault-600 dark:text-vault-300">
            <p>This public demo does not take account requests.</p>
            <p>
              Use <Link to="/login" className="text-gold-500 hover:underline">login</Link>
              {' '}to start a demo admin session or register a passkey (Viewer).
            </p>
          </div>
        ) : submitted ? (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            Request submitted. An administrator will review your account request.
          </div>
        ) : (
          <div className="space-y-4">
            <FormField label="Username" required>
              <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </FormField>
            <FormField label="Email address" required>
              <input
                type="email"
                required
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
              <p className="mt-1 text-xs text-vault-500 dark:text-vault-400">
                Required — used for account notifications if your request is approved.
              </p>
            </FormField>
            <FormField label="Display name">
              <input className={inputClass} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </FormField>
            <FormField label="Reason / notes">
              <textarea className={inputClass} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </FormField>
            <button
              type="button"
              onClick={submit}
              disabled={loading || !form.username.trim() || !form.email.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-vault-950 hover:bg-gold-400 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              Submit request
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!publicDemo && (
        <p className="mt-6 text-center text-sm text-vault-600 dark:text-vault-400">
          Already have a passkey? <Link to="/login" className="text-gold-500 hover:underline">Sign in</Link>
        </p>
        )}
      </div>
      </div>
    </div>
  )
}