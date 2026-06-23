import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, FileText, Lock, Plus, Trash2, Upload } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { api } from '../lib/api'
import type { Secret, SecretAttachment, SecretType } from '../types'
import { SECRET_TYPE_LABELS } from '../types'
import { Card, CardHeader } from '../components/ui/Card'
import { FormField, inputClass, selectClass } from '../components/ui/FormField'
import { Badge } from '../components/ui/Badge'

function SecretDocuments({
  attachments,
  onUpload,
}: {
  attachments: SecretAttachment[]
  onUpload: (file: File) => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-vault-200 bg-vault-50/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-vault-500" />
          <h4 className="text-sm font-semibold text-vault-800">Documents & Attachments</h4>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-vault-300 bg-white px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-100">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Uploading…' : 'Upload File'}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {attachments.length === 0 ? (
        <p className="text-xs text-vault-500">
          No documents stored yet. Upload photos, PDFs, QR backups, or scanned recovery sheets.
        </p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-md border border-vault-200 bg-white px-3 py-2"
            >
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-gold-600 hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0 text-vault-400" />
                {a.filename}
              </a>
              <span className="text-[10px] uppercase text-vault-400">{a.attachmentType}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Secrets() {
  const { vaults, sites } = useVault()
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [revealedContent, setRevealedContent] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    label: '',
    secretType: 'recovery_code' as SecretType,
    vaultId: '',
    siteId: '',
    content: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [attachFile, setAttachFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSecrets(await api.getSecrets())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleReveal = async (secret: Secret) => {
    if (revealed.has(secret.id)) {
      setRevealed((s) => {
        const next = new Set(s)
        next.delete(secret.id)
        return next
      })
      return
    }
    if (!window.confirm(
      'Reveal encrypted secret? Only view in a secure environment. VaultBox stores secrets encrypted at rest but this is not a substitute for a hardware security module.'
    )) return
    const full = await api.getSecret(secret.id, true)
    setRevealedContent((c) => ({ ...c, [secret.id]: full.content ?? '' }))
    setRevealed((s) => new Set(s).add(secret.id))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await api.createSecret({
        label: form.label,
        secretType: form.secretType,
        vaultId: form.vaultId || undefined,
        siteId: form.siteId || undefined,
        content: form.content,
        notes: form.notes,
      })
      if (attachFile) {
        await api.uploadSecretAttachment(created.id, attachFile)
      }
      setShowForm(false)
      setForm({ label: '', secretType: 'recovery_code', vaultId: '', siteId: '', content: '', notes: '' })
      setAttachFile(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this secret?')) return
    await api.deleteSecret(id)
    await load()
  }

  const handleUpload = async (secretId: string, file: File) => {
    await api.uploadSecretAttachment(secretId, file)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-vault-900">Secrets Vault</h2>
          <p className="text-sm text-vault-500">
            Encrypted storage for recovery codes, seed phrases, safe combinations, and document attachments
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400"
        >
          <Plus className="h-4 w-4" />
          Add Secret
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Security warning:</strong> Secrets are encrypted at rest using Fernet, but storing seed phrases or
        recovery codes in any software vault carries risk. Prefer hardware wallets and offline backups.
      </div>

      {showForm && (
        <Card>
          <CardHeader title="New Secret" />
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Label" required>
                <input className={inputClass} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </FormField>
              <FormField label="Type" required>
                <select className={selectClass} value={form.secretType} onChange={(e) => setForm({ ...form, secretType: e.target.value as SecretType })}>
                  {(Object.keys(SECRET_TYPE_LABELS) as SecretType[]).map((t) => (
                    <option key={t} value={t}>{SECRET_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Vault (optional)">
                <select className={selectClass} value={form.vaultId} onChange={(e) => setForm({ ...form, vaultId: e.target.value })}>
                  <option value="">—</option>
                  {vaults.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </FormField>
              <FormField label="Site (optional)">
                <select className={selectClass} value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>
                  <option value="">—</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FormField>
              <FormField label="Encrypted Content" className="sm:col-span-2">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Recovery code, seed phrase, PIN, safe combo…"
                />
              </FormField>
              <FormField label="Non-sensitive Notes" className="sm:col-span-2">
                <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </FormField>
            </div>

            <div className="rounded-lg border border-dashed border-vault-300 bg-vault-50/80 p-4">
              <FormField label="Document Attachment">
                <input
                  type="file"
                  className="text-sm text-vault-600"
                  onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-vault-400">
                  Attach photos, PDFs, QR code scans, or other documents. Files are stored alongside this secret.
                </p>
                {attachFile && (
                  <p className="mt-2 text-xs font-medium text-vault-700">Selected: {attachFile.name}</p>
                )}
              </FormField>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-md bg-gold-500 px-4 py-2 text-sm text-white hover:bg-gold-400 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Encrypted'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-vault-200 px-4 py-2 text-sm text-vault-600">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-vault-500">Loading secrets…</p>
      ) : secrets.length === 0 ? (
        <Card>
          <p className="text-sm text-vault-500">No secrets stored yet. Add recovery codes, QR backups, or safe documents.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {secrets.map((secret) => (
            <Card key={secret.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vault-100">
                      <Lock className="h-5 w-5 text-vault-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-vault-900">{secret.label}</h3>
                        <Badge variant="info">{SECRET_TYPE_LABELS[secret.secretType]}</Badge>
                        {secret.hasContent && <Badge>Encrypted</Badge>}
                        {secret.attachments.length > 0 && (
                          <Badge variant="default">{secret.attachments.length} file{secret.attachments.length !== 1 ? 's' : ''}</Badge>
                        )}
                      </div>
                      {secret.notes && <p className="mt-1 text-sm text-vault-500">{secret.notes}</p>}
                      {revealed.has(secret.id) && (
                        <pre className="mt-2 max-w-xl overflow-x-auto rounded-md bg-vault-900 p-3 font-mono text-xs text-emerald-300">
                          {revealedContent[secret.id] || '(empty)'}
                        </pre>
                      )}
                    </div>
                  </div>

                  <SecretDocuments
                    attachments={secret.attachments}
                    onUpload={(file) => handleUpload(secret.id, file)}
                  />
                </div>
                <div className="flex shrink-0 gap-1">
                  {secret.hasContent && (
                    <button type="button" onClick={() => toggleReveal(secret)} className="rounded-md p-2 text-vault-500 hover:bg-vault-100" title="Reveal">
                      {revealed.has(secret.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                  <button type="button" onClick={() => handleDelete(secret.id)} className="rounded-md p-2 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}