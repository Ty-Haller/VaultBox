import { useState } from 'react'
import { Plus } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import { useAdmin } from '../../context/AdminContext'
import type { AdminModelConfig } from '../admin/fieldConfig'
import { FormField, inputClass, selectClass } from '../ui/FormField'
import { Modal } from '../ui/Modal'

interface Option {
  value: string
  label: string
}

interface SelectWithAddProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  required?: boolean
  addConfig?: AdminModelConfig
  className?: string
}

function emptyFromConfig(config: AdminModelConfig): Record<string, unknown> {
  const form: Record<string, unknown> = {}
  for (const f of config.fields) {
    form[f.key] = f.defaultValue ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : '')
  }
  return form
}

export function SelectWithAdd({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  required,
  addConfig,
  className,
}: SelectWithAddProps) {
  const { refresh } = useAdmin()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openAdd = () => {
    if (!addConfig) return
    setForm(emptyFromConfig(addConfig))
    setError(null)
    setModalOpen(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addConfig) return
    setSaving(true)
    setError(null)
    try {
      const created = await adminApi.create<{ id: string }>(addConfig.resource, form)
      await refresh()
      onChange(created.id)
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
      setSaving(false)
    }
  }

  return (
    <>
      <FormField label={label} required={required} className={className}>
        <div className="flex gap-2">
          <select
            className={selectClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {addConfig && (
            <button
              type="button"
              onClick={openAdd}
              title={`Add ${addConfig.title.slice(0, -1)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-vault-200 px-2.5 text-vault-600 hover:bg-vault-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </FormField>

      {addConfig && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${addConfig.title.slice(0, -1)}`} size="md">
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {addConfig.fields.map((field) => (
              <FormField key={field.key} label={field.label} required={field.required}>
                {field.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-vault-300"
                    checked={Boolean(form[field.key])}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.checked }))}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className={selectClass}
                    value={String(form[field.key] ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  >
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={String(form[field.key] ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    type={field.type}
                    className={inputClass}
                    value={String(form[field.key] ?? '')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                      }))
                    }
                    required={field.required}
                  />
                )}
              </FormField>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border border-vault-200 px-3 py-1.5 text-sm text-vault-600">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}