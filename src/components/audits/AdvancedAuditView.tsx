import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, QrCode, Search } from 'lucide-react'
import type { AuditSession } from '../../types'
import { AUDIT_TYPE_LABELS } from '../../lib/auditWorkflow'
import { effectiveCountForLine, isLineCounted, type AuditLineState } from '../../lib/auditSession'
import { Card, CardHeader } from '../ui/Card'
import { inputClass } from '../ui/FormField'
import { AuditFormFooter } from './AuditFormFooter'
import { useAuditForm } from './useAuditForm'

interface AdvancedAuditViewProps {
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

function findLineByScan(lines: AuditLineState[], raw: string): AuditLineState | undefined {
  const q = raw.trim().toUpperCase()
  if (!q) return undefined
  return lines.find(
    (l) =>
      l.holdingQrCode?.toUpperCase() === q
      || l.holdingId?.toUpperCase() === q
      || (l.holdingId && l.holdingId.toUpperCase().replace(/-/g, '').startsWith(q.replace(/-/g, '')))
      || (l.holdingSerial && l.holdingSerial.toUpperCase() === q)
  )
}

export function AdvancedAuditView(props: AdvancedAuditViewProps) {
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
  const [scanInput, setScanInput] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  const sortedLines = useMemo(
    () => [...lines].sort((a, b) => (a.holdingQrCode ?? '').localeCompare(b.holdingQrCode ?? '')),
    [lines]
  )

  const setSessionQty = (lineId: string, value: string) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, sessionQty: value } : l)))
  }

  const setCurrentCount = (lineId: string, value: string) => {
    const currentCount = value === '' ? null : Math.max(0, parseInt(value, 10) || 0)
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, currentCount } : l)))
  }

  const handleScan = (raw: string) => {
    const match = findLineByScan(lines, raw)
    if (!match) {
      setScanError(`No audit item matches "${raw.trim()}"`)
      setHighlightId(null)
      return
    }
    setScanError(null)
    setHighlightId(match.id)
    rowRefs.current[match.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/vaults/${vaultId}`} className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">Advanced Audit</h2>
          <p className="text-sm text-vault-500">
            {vaultName} — {AUDIT_TYPE_LABELS.advanced} · verify each asset by ID / QR code
            {savedAt && <span className="ml-2 text-emerald-600">· Saved at {savedAt}</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader title="Scan or search asset" subtitle="Enter a QR code, holding ID, or serial number to jump to that row" />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <QrCode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Scan QR / enter code…"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleScan(scanInput)
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => handleScan(scanInput)}
            className="inline-flex items-center gap-1.5 rounded-md border border-vault-300 px-3 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50"
          >
            <Search className="h-4 w-4" />
            Find
          </button>
        </div>
        {scanError && <p className="mt-2 text-sm text-red-600">{scanError}</p>}
      </Card>

      <Card>
        <CardHeader
          title="Asset-by-asset verification"
          subtitle="Session ± adds or subtracts on save. Complete commits all entered values."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-vault-100 text-left text-xs uppercase tracking-wide text-vault-500">
                <th className="px-4 py-2">QR Code</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2 w-24">Expected</th>
                <th className="px-4 py-2 w-28">Session ±</th>
                <th className="px-4 py-2 w-28">Current</th>
                <th className="px-4 py-2 w-16">Match</th>
              </tr>
            </thead>
            <tbody>
              {sortedLines.map((line) => {
                const counted = isLineCounted(line)
                const effective = effectiveCountForLine(line)
                const match = counted && effective === line.expectedQty
                const highlighted = highlightId === line.id
                return (
                  <tr
                    key={line.id}
                    ref={(el) => { rowRefs.current[line.id] = el }}
                    className={`border-b border-vault-50 transition-colors ${
                      highlighted ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-vault-800">
                        {line.holdingQrCode ?? '—'}
                      </span>
                      {line.holdingSerial && (
                        <p className="font-mono text-[10px] text-vault-400">SN {line.holdingSerial}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-vault-800">{line.holdingName}</p>
                      {line.holdingId && (
                        <p className="font-mono text-[10px] text-vault-400">{line.holdingId.slice(0, 8)}…</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-vault-600">{line.expectedQty}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className={inputClass}
                        placeholder="+/−"
                        value={line.sessionQty}
                        onChange={(e) => setSessionQty(line.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={line.currentCount ?? ''}
                        onChange={(e) => setCurrentCount(line.id, e.target.value)}
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