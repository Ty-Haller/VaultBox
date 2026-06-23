import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import type { SmtpDeliveryConfig } from '../../types/notifications'
import { Card, CardHeader } from '../../components/ui/Card'
import { FormField, inputClass } from '../../components/ui/FormField'

export function NotificationDeliveryPage() {
  const [config, setConfig] = useState<SmtpDeliveryConfig & { password?: string }>({
    enabled: false,
    host: '',
    port: 587,
    tls: true,
    user: '',
    fromEmail: '',
    hasPassword: false,
    password: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getSmtpDelivery()
      setConfig((prev) => ({ ...prev, ...data, password: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load SMTP settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    setError(null)
    setTestResult(null)
    try {
      const payload: Record<string, unknown> = {
        enabled: config.enabled,
        host: config.host,
        port: config.port,
        tls: config.tls,
        user: config.user,
        fromEmail: config.fromEmail,
      }
      if (config.password) payload.password = config.password
      const data = await adminApi.updateSmtpDelivery(payload)
      setConfig((prev) => ({ ...prev, ...data, password: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const testSend = async () => {
    setTesting(true)
    setTestResult(null)
    setError(null)
    try {
      const result = await adminApi.testSmtpDelivery()
      setTestResult(result.sent ? 'Test email sent to your account address.' : 'SMTP not configured or send failed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test send failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-vault-500">Loading SMTP settings…</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/notifications" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Notification Delivery</h2>
          <p className="text-sm text-vault-500">Admin-only SMTP relay for email notifications</p>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {testResult && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{testResult}</p>}

      <Card>
        <CardHeader title="SMTP Relay" />
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-vault-700">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
            />
            Enable SMTP email delivery
          </label>

          <FormField label="Host">
            <input className={inputClass} value={config.host} onChange={(e) => setConfig((c) => ({ ...c, host: e.target.value }))} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Port">
              <input
                type="number"
                className={inputClass}
                value={config.port}
                onChange={(e) => setConfig((c) => ({ ...c, port: Number(e.target.value) }))}
              />
            </FormField>
            <FormField label="TLS">
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.tls}
                  onChange={(e) => setConfig((c) => ({ ...c, tls: e.target.checked }))}
                />
                Use STARTTLS
              </label>
            </FormField>
          </div>

          <FormField label="Username">
            <input className={inputClass} value={config.user} onChange={(e) => setConfig((c) => ({ ...c, user: e.target.value }))} />
          </FormField>

          <FormField label={config.hasPassword ? 'Password (leave blank to keep)' : 'Password'}>
            <input
              type="password"
              className={inputClass}
              value={config.password ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, password: e.target.value }))}
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="From email">
            <input className={inputClass} value={config.fromEmail} onChange={(e) => setConfig((c) => ({ ...c, fromEmail: e.target.value }))} />
          </FormField>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-vault-800 px-4 py-2 text-sm text-white hover:bg-vault-700 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save SMTP settings'}
            </button>
            <button
              type="button"
              onClick={testSend}
              disabled={testing || !config.enabled}
              className="flex items-center gap-2 rounded-md border border-vault-200 px-4 py-2 text-sm hover:bg-vault-50 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {testing ? 'Sending…' : 'Send test email'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}