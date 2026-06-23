import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Plus, Pencil, Trash2 } from 'lucide-react'

interface ActionBarProps {
  addLabel: string
  addTo: string
  editTo?: string
  onDelete?: () => void
  deleteLabel?: string
  onTransact?: () => void
  transactLabel?: string
  extra?: ReactNode
}

export function ActionBar({
  addLabel,
  addTo,
  editTo,
  onDelete,
  deleteLabel,
  onTransact,
  transactLabel,
  extra,
}: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-vault-200 bg-white px-4 py-3 shadow-sm">
      <Link
        to={addTo}
        className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Link>
      {editTo && (
        <Link
          to={editTo}
          className="inline-flex items-center gap-2 rounded-md border border-vault-300 bg-white px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      )}
      {onTransact && (
        <button
          type="button"
          onClick={onTransact}
          className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
        >
          <ArrowRightLeft className="h-4 w-4" />
          {transactLabel ?? 'Transact'}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleteLabel ?? 'Delete'}
        </button>
      )}
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  )
}