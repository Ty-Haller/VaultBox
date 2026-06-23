import { useEffect, useRef, useState } from 'react'
import { Columns3 } from 'lucide-react'
import {
  INVENTORY_COLUMN_DEFS,
  type InventoryColumnKey,
  saveVisibleColumns,
} from '../../lib/inventoryColumns'

interface ColumnPickerProps {
  visible: InventoryColumnKey[]
  onChange: (columns: InventoryColumnKey[]) => void
}

export function ColumnPicker({ visible, onChange }: ColumnPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (key: InventoryColumnKey) => {
    const def = INVENTORY_COLUMN_DEFS.find((c) => c.key === key)
    if (def?.locked) return
    const next = visible.includes(key)
      ? visible.filter((k) => k !== key)
      : [...visible, key]
    const ordered = INVENTORY_COLUMN_DEFS.map((c) => c.key).filter((k) => next.includes(k))
    onChange(ordered)
    saveVisibleColumns(ordered)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-vault-200 bg-white px-3 py-1.5 text-sm text-vault-700 hover:bg-vault-50"
      >
        <Columns3 className="h-4 w-4" />
        Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-md border border-vault-200 bg-white py-2 shadow-lg">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-vault-400">Show columns</p>
          {INVENTORY_COLUMN_DEFS.map((col) => (
            <label
              key={col.key}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm ${col.locked ? 'text-vault-400' : 'cursor-pointer hover:bg-vault-50'}`}
            >
              <input
                type="checkbox"
                checked={visible.includes(col.key)}
                disabled={col.locked}
                onChange={() => toggle(col.key)}
                className="rounded border-vault-300"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}