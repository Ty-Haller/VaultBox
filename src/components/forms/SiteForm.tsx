import { useState } from 'react'
import type { Site } from '../../types'
import { FormField, inputClass, TagsInput } from '../ui/FormField'

type SiteInput = Omit<Site, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>

interface SiteFormProps {
  initial?: Partial<Site>
  onSubmit: (data: SiteInput) => Promise<void>
  onCancel: () => void
}

const empty: SiteInput = {
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  country: 'USA',
  postalCode: '',
  notes: '',
  tags: [],
}

export function SiteForm({ initial, onSubmit, onCancel }: SiteFormProps) {
  const [form, setForm] = useState<SiteInput>({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof SiteInput>(key: K, value: SiteInput[K]) =>
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
        <FormField label="Description" className="sm:col-span-2">
          <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>
        <FormField label="Address" className="sm:col-span-2">
          <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </FormField>
        <FormField label="City">
          <input className={inputClass} value={form.city} onChange={(e) => set('city', e.target.value)} />
        </FormField>
        <FormField label="State">
          <input className={inputClass} value={form.state} onChange={(e) => set('state', e.target.value)} />
        </FormField>
        <FormField label="Country">
          <input className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} />
        </FormField>
        <FormField label="Postal Code">
          <input className={inputClass} value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
        </FormField>
        <FormField label="Latitude">
          <input type="number" step="any" className={inputClass} value={form.latitude ?? ''} onChange={(e) => set('latitude', e.target.value ? parseFloat(e.target.value) : undefined)} />
        </FormField>
        <FormField label="Longitude">
          <input type="number" step="any" className={inputClass} value={form.longitude ?? ''} onChange={(e) => set('longitude', e.target.value ? parseFloat(e.target.value) : undefined)} />
        </FormField>
        <FormField label="Contact Name">
          <input className={inputClass} value={form.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} />
        </FormField>
        <FormField label="Contact Phone">
          <input className={inputClass} value={form.contactPhone ?? ''} onChange={(e) => set('contactPhone', e.target.value)} />
        </FormField>
        <FormField label="Tags" className="sm:col-span-2">
          <TagsInput value={form.tags} onChange={(tags) => set('tags', tags)} />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t border-vault-100 pt-4">
        <button type="button" onClick={onCancel} className="rounded-md border border-vault-200 px-4 py-2 text-sm text-vault-600 hover:bg-vault-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50">
          {saving ? 'Saving...' : initial?.id ? 'Update Site' : 'Create Site'}
        </button>
      </div>
    </form>
  )
}