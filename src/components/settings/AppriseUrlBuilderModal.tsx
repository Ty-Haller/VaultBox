import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import {
  APPRISE_CATEGORY_LABELS,
  type AppriseCategory,
  type AppriseServiceDefinition,
  buildAppriseUrl,
  defaultFieldValues,
  getAppriseService,
  searchAppriseServices,
  servicesByCategory,
} from '../../lib/appriseServices'
import { Modal } from '../ui/Modal'
import { FormField, inputClass, selectClass } from '../ui/FormField'

interface AppriseUrlBuilderModalProps {
  open: boolean
  onClose: () => void
  onAdd: (url: string) => void
}

const CATEGORY_ORDER: AppriseCategory[] = ['chat', 'push', 'home', 'email', 'sms', 'custom']

export function AppriseUrlBuilderModal({ open, onClose, onAdd }: AppriseUrlBuilderModalProps) {
  const [step, setStep] = useState<'pick' | 'configure'>('pick')
  const [query, setQuery] = useState('')
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const service = serviceId ? getAppriseService(serviceId) : undefined

  const filtered = useMemo(() => searchAppriseServices(query), [query])
  const grouped = useMemo(() => servicesByCategory(filtered), [filtered])

  const preview = useMemo(() => {
    if (!service) return null
    return buildAppriseUrl(service, values)
  }, [service, values])

  useEffect(() => {
    if (!open) {
      setStep('pick')
      setQuery('')
      setServiceId(null)
      setValues({})
      setError(null)
    }
  }, [open])

  const selectService = (next: AppriseServiceDefinition) => {
    setServiceId(next.id)
    setValues(defaultFieldValues(next))
    setError(null)
    setStep('configure')
  }

  const setField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleAdd = () => {
    if (!service) return
    const result = buildAppriseUrl(service, values)
    if (!result.url) {
      setError(result.error ?? 'Could not build URL')
      return
    }
    onAdd(result.url)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'pick' ? 'Add Apprise service' : service?.name ?? 'Configure service'}
      size="lg"
    >
      {step === 'pick' ? (
        <div className="space-y-4">
          <p className="text-sm text-vault-600 dark:text-vault-400">
            Choose a notification service. VaultBox stores standard Apprise URLs and delivers alerts through them.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
            <input
              type="search"
              className={`${inputClass} pl-9`}
              placeholder="Search services…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
            {CATEGORY_ORDER.map((category) => {
              const items = grouped[category]
              if (items.length === 0) return null
              return (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-vault-500">
                    {APPRISE_CATEGORY_LABELS[category]}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectService(item)}
                        className="rounded-lg border border-vault-200 px-3 py-2.5 text-left transition-colors hover:border-gold-500/50 hover:bg-vault-50 dark:border-vault-600 dark:hover:bg-vault-800"
                      >
                        <p className="text-sm font-medium text-vault-900 dark:text-vault-100">{item.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-vault-500">{item.example}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-vault-500">No services match your search.</p>
            )}
          </div>
        </div>
      ) : service ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('pick')
                setServiceId(null)
                setError(null)
              }}
              className="text-sm font-medium text-vault-600 hover:text-vault-900 dark:text-vault-400 dark:hover:text-vault-100"
            >
              ← Back to services
            </button>
            <a
              href={service.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:underline dark:text-gold-400"
            >
              Documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <p className="rounded-md bg-vault-50 px-3 py-2 font-mono text-xs text-vault-600 dark:bg-vault-800 dark:text-vault-300">
            {service.example}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.fields.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                required={field.required === true}
                className={field.type === 'text' && field.key === 'url' ? 'sm:col-span-2' : undefined}
              >
                {field.type === 'select' ? (
                  <select
                    className={selectClass}
                    value={values[field.key] ?? field.defaultValue ?? ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                  >
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm text-vault-700 dark:text-vault-300">
                    <input
                      type="checkbox"
                      checked={values[field.key] === 'true'}
                      onChange={(e) => setField(field.key, e.target.checked ? 'true' : 'false')}
                      className="h-4 w-4 rounded border-vault-300"
                    />
                    Enabled
                  </label>
                ) : (
                  <input
                    type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                    className={inputClass}
                    value={values[field.key] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => setField(field.key, e.target.value)}
                    autoComplete="off"
                  />
                )}
                {field.help && (
                  <p className="mt-1 text-xs text-vault-500 dark:text-vault-400">{field.help}</p>
                )}
              </FormField>
            ))}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-vault-500">Preview</p>
            <pre className="overflow-x-auto rounded-md border border-vault-200 bg-vault-50 px-3 py-2 font-mono text-xs text-vault-800 dark:border-vault-600 dark:bg-vault-800 dark:text-vault-200">
              {preview?.url ?? 'Fill in the required fields…'}
            </pre>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-vault-200 pt-4 dark:border-vault-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-vault-200 px-4 py-2 text-sm text-vault-700 hover:bg-vault-50 dark:border-vault-600 dark:text-vault-200 dark:hover:bg-vault-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!preview?.url}
              className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-50"
            >
              Add URL
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}