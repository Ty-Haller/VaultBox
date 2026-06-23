import { useState } from 'react'
import type { Vault, VaultType } from '../../types'
import { VAULT_TYPE_LABELS } from '../../types'
import { useAdmin } from '../../context/AdminContext'
import { useVault } from '../../context/VaultContext'
import { FormField, inputClass, selectClass, TagsInput } from '../ui/FormField'

type VaultInput = Omit<Vault, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>

interface VaultFormProps {
  initial?: Partial<Vault>
  onSubmit: (data: VaultInput) => Promise<void>
  onCancel: () => void
}

const empty: VaultInput = {
  name: '',
  siteId: '',
  type: 'home-safe',
  description: '',
  securityLevel: 3,
  notes: '',
  tags: [],
}

export function VaultForm({ initial, onSubmit, onCancel }: VaultFormProps) {
  const { sites } = useVault()
  const { activeVaultTypes } = useAdmin()
  const vaultTypeOptions = activeVaultTypes.length > 0
    ? activeVaultTypes.map((v) => ({ value: v.slug as VaultType, label: v.name }))
    : (Object.keys(VAULT_TYPE_LABELS) as VaultType[]).map((t) => ({ value: t, label: VAULT_TYPE_LABELS[t] }))
  const [form, setForm] = useState<VaultInput>({ ...empty, ...initial, siteId: initial?.siteId ?? sites[0]?.id ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof VaultInput>(key: K, value: VaultInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Name" required className="sm:col-span-2">
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </FormField>
        <FormField label="Site" required>
          <select className={selectClass} value={form.siteId} onChange={(e) => set('siteId', e.target.value)} required>
            <option value="">Select site...</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Type" required>
          <select className={selectClass} value={form.type} onChange={(e) => set('type', e.target.value as VaultType)}>
            {vaultTypeOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Security Level (1-5)" required>
          <input type="number" min={1} max={5} className={inputClass} value={form.securityLevel} onChange={(e) => set('securityLevel', parseInt(e.target.value) as 1|2|3|4|5)} />
        </FormField>
        <FormField label="Capacity (oz)">
          <input type="number" step="any" className={inputClass} value={form.capacityOz ?? ''} onChange={(e) => set('capacityOz', e.target.value ? parseFloat(e.target.value) : undefined)} />
        </FormField>
        <FormField label="Manufacturer">
          <input className={inputClass} value={form.manufacturer ?? ''} onChange={(e) => set('manufacturer', e.target.value)} />
        </FormField>
        <FormField label="Model">
          <input className={inputClass} value={form.model ?? ''} onChange={(e) => set('model', e.target.value)} />
        </FormField>
        <FormField label="Serial Number">
          <input className={inputClass} value={form.serialNumber ?? ''} onChange={(e) => set('serialNumber', e.target.value)} />
        </FormField>
        <FormField label="Fire Rating">
          <input className={inputClass} value={form.fireRating ?? ''} onChange={(e) => set('fireRating', e.target.value)} />
        </FormField>
        <FormField label="Install Date">
          <input type="date" className={inputClass} value={form.installDate ?? ''} onChange={(e) => set('installDate', e.target.value)} />
        </FormField>
        <FormField label="Last Audit Date">
          <input type="date" className={inputClass} value={form.lastAuditDate ?? ''} onChange={(e) => set('lastAuditDate', e.target.value)} />
        </FormField>
        <FormField label="Weight Capacity (lbs)">
          <input type="number" step="any" className={inputClass} value={form.weightCapacityLbs ?? ''} onChange={(e) => set('weightCapacityLbs', e.target.value ? parseFloat(e.target.value) : undefined)} />
        </FormField>
        <FormField label="Description" className="sm:col-span-2">
          <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>
        <FormField label="Tags" className="sm:col-span-2">
          <TagsInput value={form.tags} onChange={(tags) => set('tags', tags)} />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </FormField>
      </div>

      <div className="rounded-lg border border-vault-100 p-4 dark:border-vault-700">
        <h3 className="text-sm font-semibold text-vault-900 dark:text-white">Alert thresholds</h3>
        <p className="mt-1 text-xs text-vault-500">Enable delivery channels in User Settings → Notification Preferences.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Capacity alert threshold (%)">
            <input
              type="number"
              step="0.1"
              min={0}
              max={100}
              className={inputClass}
              value={form.capacityAlertThresholdPct ?? ''}
              onChange={(e) => set('capacityAlertThresholdPct', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Default from system (e.g. 85)"
            />
          </FormField>
          <FormField label="Audit interval override (days)">
            <input
              type="number"
              className={inputClass}
              value={form.auditIntervalDaysOverride ?? ''}
              onChange={(e) => set('auditIntervalDaysOverride', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder="Use workflow default"
            />
          </FormField>
          <FormField label="Audit reminder (days before due)">
            <input
              type="number"
              className={inputClass}
              value={form.auditReminderDaysOverride ?? ''}
              onChange={(e) => set('auditReminderDaysOverride', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder="Use workflow default"
            />
          </FormField>
          <FormField label="Audit alert refire (hours)">
            <input
              type="number"
              className={inputClass}
              value={form.auditRefireHoursOverride ?? ''}
              onChange={(e) => set('auditRefireHoursOverride', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder="Default 72"
            />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-vault-100 pt-4">
        <button type="button" onClick={onCancel} className="rounded-md border border-vault-200 px-4 py-2 text-sm text-vault-600 hover:bg-vault-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50">
          {saving ? 'Saving...' : initial?.id ? 'Update Vault' : 'Create Vault'}
        </button>
      </div>
    </form>
  )
}