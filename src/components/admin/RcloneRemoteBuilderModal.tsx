import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import {
  RCLONE_CATEGORY_LABELS,
  type RcloneCategory,
  type RcloneRemoteDefinition,
  buildRcloneRemote,
  defaultRemoteFieldValues,
  getRcloneRemoteDef,
  remotesByCategory,
  searchRcloneRemotes,
} from '../../lib/rcloneRemotes'
import type { RcloneRemote } from '../../types/backups'
import { Modal } from '../ui/Modal'
import { FormField, inputClass, selectClass } from '../ui/FormField'

interface RcloneRemoteBuilderModalProps {
  open: boolean
  onClose: () => void
  onAdd: (remote: Omit<RcloneRemote, 'id'>) => void
}

const CATEGORY_ORDER: RcloneCategory[] = ['storage', 'cloud', 'protocol', 'local']

export function RcloneRemoteBuilderModal({ open, onClose, onAdd }: RcloneRemoteBuilderModalProps) {
  const [step, setStep] = useState<'pick' | 'configure'>('pick')
  const [query, setQuery] = useState('')
  const [typeId, setTypeId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const def = typeId ? getRcloneRemoteDef(typeId) : undefined
  const filtered = useMemo(() => searchRcloneRemotes(query), [query])
  const grouped = useMemo(() => remotesByCategory(filtered), [filtered])

  const preview = useMemo(() => {
    if (!def) return null
    return buildRcloneRemote(def, values)
  }, [def, values])

  useEffect(() => {
    if (!open) {
      setStep('pick')
      setQuery('')
      setTypeId(null)
      setValues({})
      setError(null)
    }
  }, [open])

  const selectType = (next: RcloneRemoteDefinition) => {
    setTypeId(next.id)
    setValues(defaultRemoteFieldValues(next))
    setError(null)
    setStep('configure')
  }

  const setField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleAdd = () => {
    if (!def) return
    const result = buildRcloneRemote(def, values)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onAdd(result)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'pick' ? 'Add rclone remote' : def?.name ?? 'Configure remote'}
      size="lg"
    >
      {step === 'pick' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
            <input
              type="search"
              className={`${inputClass} pl-9`}
              placeholder="Search remotes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
            {CATEGORY_ORDER.map((category) => {
              const items = grouped[category]
              if (items.length === 0) return null
              return (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-vault-500">
                    {RCLONE_CATEGORY_LABELS[category]}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectType(item)}
                        className="rounded-lg border border-vault-200 px-3 py-2.5 text-left hover:border-gold-500/50 hover:bg-vault-50 dark:border-vault-600 dark:hover:bg-vault-800"
                      >
                        <p className="text-sm font-medium text-vault-900 dark:text-vault-100">{item.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-vault-500">{item.example}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : def ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => { setStep('pick'); setTypeId(null); setError(null) }}
              className="text-sm font-medium text-vault-600 hover:text-vault-900 dark:text-vault-400"
            >
              ← Back
            </button>
            <a href={def.docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:underline">
              rclone docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Display name" required>
              <input className={inputClass} value={values.displayName ?? ''} onChange={(e) => setField('displayName', e.target.value)} placeholder="e.g. s3-prod" />
            </FormField>
            <FormField label="Destination path" help="Folder path on the remote (bucket prefix).">
              <input className={inputClass} value={values.destinationPath ?? ''} onChange={(e) => setField('destinationPath', e.target.value)} placeholder="vaultbox/backups" />
            </FormField>
            {def.fields.filter((f) => f.key !== 'noconfig').map((field) => (
              <FormField key={field.key} label={field.label} required={field.required !== false} className={field.type === 'password' ? 'sm:col-span-2' : undefined}>
                {field.type === 'select' ? (
                  <select className={selectClass} value={values[field.key] ?? ''} onChange={(e) => setField(field.key, e.target.value)}>
                    {(field.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    className={inputClass}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    autoComplete="off"
                  />
                )}
                {field.help && <p className="mt-1 text-xs text-vault-500">{field.help}</p>}
              </FormField>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-vault-200 pt-4 dark:border-vault-700">
            <button type="button" onClick={onClose} className="rounded-md border border-vault-200 px-4 py-2 text-sm">Cancel</button>
            <button type="button" onClick={handleAdd} disabled={!preview || 'error' in (preview ?? {})} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-50">
              Add remote
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}