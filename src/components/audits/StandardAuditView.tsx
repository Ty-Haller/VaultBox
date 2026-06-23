import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { AuditSession } from '../../types'
import { AUDIT_TYPE_LABELS } from '../../lib/auditWorkflow'
import { effectiveCountForLine, isLineCounted, type AuditLineState } from '../../lib/auditSession'
import { Card, CardHeader } from '../ui/Card'
import { inputClass } from '../ui/FormField'
import { AuditFormFooter } from './AuditFormFooter'
import { useAuditForm } from './useAuditForm'

interface StandardAuditViewProps {
  vaultId: string
  vaultName: string
  audit: AuditSession
  lines: AuditLineState[]
  setLines: React.Dispatch<React.SetStateAction<AuditLineState[]>>
  performedBy: string
  setPerformedBy: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  saving: boolean
  setSaving: (v: boolean) => void
  savedAt: string | null
  setSavedAt: (v: string | null) => void
  error: string | null
  setError: (v: string | null) => void
  setAudit: (a: AuditSession) => void
}

export function StandardAuditView(props: StandardAuditViewProps) {
  const {
    vaultId,
    vaultName,
    lines,
    setLines,
    performedBy,
    setPerformedBy,
    notes,
    setNotes,
    saving,
    savedAt,
    error,
  } = props

  const { handleSaveDraft, handleComplete, handleCancel } = useAuditForm(props)

  const setTotalCount = (lineId: string, value: string) => {
    const currentCount = value === '' ? null : Math.max(0, parseInt(value, 10) || 0)
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, currentCount, sessionQty: '' } : l)))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/vaults/${vaultId}`} className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Standard Audit</h2>
          <p className="text-sm text-vault-500">
            {vaultName} — {AUDIT_TYPE_LABELS.standard} · product type totals
            {savedAt && <span className="ml-2 text-emerald-600">· Saved at {savedAt}</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader
          title="Product Type Counts"
          subtitle="Enter the total physical count for each product type. Complete commits all entered totals without a prior save."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-vault-100 text-left text-xs uppercase tracking-wide text-vault-500">
                <th className="px-4 py-2">Product Type</th>
                <th className="px-4 py-2 w-28">Expected</th>
                <th className="px-4 py-2 w-36">Total Count</th>
                <th className="px-4 py-2 w-24">Match</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const counted = isLineCounted(line)
                const effective = effectiveCountForLine(line)
                const match = counted && effective === line.expectedQty
                return (
                  <tr key={line.id} className="border-b border-vault-50">
                    <td className="px-4 py-3 font-medium text-vault-800">{line.holdingName}</td>
                    <td className="px-4 py-3 font-mono text-vault-600">{line.expectedQty}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        placeholder="Count"
                        value={line.currentCount ?? ''}
                        onChange={(e) => setTotalCount(line.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {!counted ? (
                        <span className="text-vault-400">—</span>
                      ) : match ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="font-medium text-amber-600">≠</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <AuditFormFooter
          performedBy={performedBy}
          setPerformedBy={setPerformedBy}
          notes={notes}
          setNotes={setNotes}
          saving={saving}
          onSave={handleSaveDraft}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </Card>
    </div>
  )
}