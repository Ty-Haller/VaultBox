import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Filter, X } from 'lucide-react'
import { exportTableCsv } from '../../lib/csvExport'
import { cn } from '../../lib/utils'
import { ExportCsvButton } from './ExportCsvButton'

export interface FilterableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
  filterable?: boolean
  getSortValue?: (row: T) => string | number | null
  getFilterValue?: (row: T) => string
  getCsvValue?: (row: T) => string
}

interface FilterableDataTableProps<T> {
  columns: FilterableColumn<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyMessage?: string
  exportFilename?: string
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

function compareValues(a: string | number | null, b: string | number | null, dir: 'asc' | 'desc'): number {
  const av = a ?? ''
  const bv = b ?? ''
  let cmp = 0
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv
  } else {
    cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
  }
  return dir === 'asc' ? cmp : -cmp
}

function ColumnMenu<T>({
  column,
  data,
  sort,
  filterValues,
  onSort,
  onFilterChange,
  onClearFilter,
}: {
  column: FilterableColumn<T>
  data: T[]
  sort: SortState
  filterValues: Set<string> | undefined
  onSort: (key: string, direction: 'asc' | 'desc' | null) => void
  onFilterChange: (key: string, values: Set<string>) => void
  onClearFilter: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const options = useMemo(() => {
    if (!column.filterable || !column.getFilterValue) return []
    const vals = new Set<string>()
    for (const row of data) {
      const v = column.getFilterValue!(row).trim()
      vals.add(v || '—')
    }
    return [...vals].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [column, data])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isSorted = sort?.key === column.key
  const hasFilter = filterValues && filterValues.size > 0

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-vault-200/60',
          (isSorted || hasFilter) && 'text-gold-600'
        )}
      >
        <span>{column.header}</span>
        {isSorted && (sort!.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        {hasFilter && <Filter className="h-3 w-3" />}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] max-w-[260px] rounded-md border border-vault-200 bg-white py-1 shadow-lg">
          {column.sortable && (
            <div className="border-b border-vault-100 px-2 py-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-vault-400">Sort</p>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-vault-50"
                onClick={() => { onSort(column.key, 'asc'); setOpen(false) }}
              >
                <ArrowUp className="h-3 w-3" /> Ascending
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-vault-50"
                onClick={() => { onSort(column.key, 'desc'); setOpen(false) }}
              >
                <ArrowDown className="h-3 w-3" /> Descending
              </button>
              {isSorted && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-vault-500 hover:bg-vault-50"
                  onClick={() => { onSort(column.key, null); setOpen(false) }}
                >
                  <X className="h-3 w-3" /> Clear sort
                </button>
              )}
            </div>
          )}
          {column.filterable && column.getFilterValue && options.length > 0 && (
            <div className="max-h-48 overflow-y-auto px-2 py-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-vault-400">Filter</p>
              {options.map((opt) => {
                const selected = !filterValues || filterValues.size === 0 || filterValues.has(opt)
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-vault-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const current = filterValues ?? new Set(options)
                        const next = new Set(current)
                        if (selected) next.delete(opt)
                        else next.add(opt)
                        onFilterChange(column.key, next)
                      }}
                      className="rounded border-vault-300"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                )
              })}
              {hasFilter && (
                <button
                  type="button"
                  className="mt-1 w-full px-2 py-1 text-left text-xs text-vault-500 hover:bg-vault-50"
                  onClick={() => onClearFilter(column.key)}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FilterableDataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = 'No records found',
  exportFilename,
}: FilterableDataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({})

  const processed = useMemo(() => {
    let rows = [...data]
    for (const col of columns) {
      const selected = columnFilters[col.key]
      if (!selected || selected.size === 0 || !col.getFilterValue) continue
      rows = rows.filter((row) => {
        const v = col.getFilterValue!(row).trim() || '—'
        return selected.has(v)
      })
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col?.getSortValue) {
        rows.sort((a, b) => compareValues(col.getSortValue!(a), col.getSortValue!(b), sort.direction))
      }
    }
    return rows
  }, [data, columns, sort, columnFilters])

  const handleExport = () => {
    if (!exportFilename || data.length === 0) return
    exportTableCsv(exportFilename, processed, columns)
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-vault-300 bg-vault-50 px-6 py-12 text-center text-sm text-vault-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {exportFilename && (
        <div className="flex justify-end">
          <ExportCsvButton onClick={handleExport} />
        </div>
      )}
    <div className="overflow-x-auto rounded-lg border border-vault-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-vault-200 bg-vault-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-vault-500',
                  col.className
                )}
              >
                {col.sortable || col.filterable ? (
                  <ColumnMenu
                    column={col}
                    data={data}
                    sort={sort}
                    filterValues={columnFilters[col.key]}
                    onSort={(key, direction) => setSort(direction ? { key, direction } : null)}
                    onFilterChange={(key, values) =>
                      setColumnFilters((f) => ({ ...f, [key]: values }))
                    }
                    onClearFilter={(key) =>
                      setColumnFilters((f) => {
                        const next = { ...f }
                        delete next[key]
                        return next
                      })
                    }
                  />
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-vault-100">
          {processed.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-vault-500">
                No rows match the column filters.
              </td>
            </tr>
          ) : (
            processed.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'bg-white transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-vault-50'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-vault-800', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  )
}