import { useState } from 'react'
import { X } from 'lucide-react'
import type { Holding, HoldingTransactionType } from '../../types'
import { FormField, inputClass, selectClass } from '../ui/FormField'

interface TransactModalProps {
  holding: Holding
  onClose: () => void
  onSubmit: (data: {
    type: HoldingTransactionType
    transactionDate?: string
    salePrice?: number
    buyerName?: string
    insuranceClaimNumber?: string
    transactionNotes?: string
  }) => Promise<void>
}

const TYPE_LABELS: Record<HoldingTransactionType, string> = {
  sold: 'Mark as Sold',
  stolen: 'Mark as Stolen',
  deleted: 'Delete / Remove',
}

const TYPE_DESCRIPTIONS: Record<HoldingTransactionType, string> = {
  sold: 'Archive this holding with sale details. It will be hidden from active inventory.',
  stolen: 'Archive as stolen or lost. Record insurance claim details if applicable.',
  deleted: 'Remove from active inventory and archive the record.',
}

export function TransactModal({ holding, onClose, onSubmit }: TransactModalProps) {
  const [type, setType] = useState<HoldingTransactionType>('sold')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [salePrice, setSalePrice] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState('')
  const [transactionNotes, setTransactionNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        type,
        transactionDate: transactionDate || undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        buyerName: buyerName || undefined,
        insuranceClaimNumber: insuranceClaimNumber || undefined,
        transactionNotes: transactionNotes || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-vault-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-vault-900">Transact Holding</h3>
            <p className="text-sm text-vault-500">{holding.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-vault-400 hover:bg-vault-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <FormField label="Transaction Type" required>
            <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as HoldingTransactionType)}>
              {(Object.keys(TYPE_LABELS) as HoldingTransactionType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </FormField>
          <p className="text-xs text-vault-500">{TYPE_DESCRIPTIONS[type]}</p>

          <FormField label="Transaction Date">
            <input type="date" className={inputClass} value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
          </FormField>

          {type === 'sold' && (
            <>
              <FormField label="Sale Price ($)">
                <input type="number" step="any" className={inputClass} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </FormField>
              <FormField label="Buyer / Counterparty">
                <input className={inputClass} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Name or exchange" />
              </FormField>
            </>
          )}

          {type === 'stolen' && (
            <FormField label="Insurance Claim Number">
              <input className={inputClass} value={insuranceClaimNumber} onChange={(e) => setInsuranceClaimNumber(e.target.value)} placeholder="Claim or police report #" />
            </FormField>
          )}

          <FormField label="Notes">
            <textarea
              className={inputClass}
              rows={3}
              value={transactionNotes}
              onChange={(e) => setTransactionNotes(e.target.value)}
              placeholder="Additional details about this transaction…"
            />
          </FormField>

          <div className="flex justify-end gap-3 border-t border-vault-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-vault-200 px-4 py-2 text-sm text-vault-600 hover:bg-vault-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                type === 'deleted' ? 'bg-red-600 hover:bg-red-500' : 'bg-gold-500 hover:bg-gold-400'
              }`}
            >
              {saving ? 'Processing…' : TYPE_LABELS[type]}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}