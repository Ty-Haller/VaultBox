import { Link } from 'react-router-dom'
import { ClipboardCheck, Save } from 'lucide-react'
import { FormField, inputClass } from '../ui/FormField'

interface AuditFormFooterProps {
  performedBy: string
  setPerformedBy: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  saving: boolean
  onSave: () => void
  onComplete: () => void
  onCancel: () => void
}

export function AuditFormFooter({
  performedBy,
  setPerformedBy,
  notes,
  setNotes,
  saving,
  onSave,
  onComplete,
  onCancel,
}: AuditFormFooterProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Performed By">
          <input
            className={inputClass}
            value={performedBy}
            onChange={(e) => setPerformedBy(e.target.value)}
            placeholder="Your name"
          />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <textarea
            className={inputClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Audit notes…"
          />
        </FormField>
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel Audit
        </button>
        <div className="flex flex-wrap justify-end gap-3">
        <Link
          to="/audits"
          className="rounded-md border border-vault-200 px-4 py-2 text-sm font-medium text-vault-600 hover:bg-vault-50"
        >
          Back to Audits
        </Link>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md border border-vault-300 bg-white px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Progress'}
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50"
        >
          <ClipboardCheck className="h-4 w-4" />
          {saving ? 'Submitting…' : 'Complete Audit & Save Report'}
        </button>
        </div>
      </div>
    </>
  )
}