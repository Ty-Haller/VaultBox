import { exportTableCsv } from '../../lib/csvExport'
import { cn } from '../../lib/utils'
import { ExportCsvButton } from './ExportCsvButton'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
  getCsvValue?: (row: T) => string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyMessage?: string
  exportFilename?: string
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = 'No records found',
  exportFilename,
}: DataTableProps<T>) {
  const handleExport = () => {
    if (!exportFilename || data.length === 0) return
    exportTableCsv(exportFilename, data, columns)
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-vault-300 bg-vault-50 px-6 py-12 text-center text-sm text-vault-500 dark:border-vault-600 dark:bg-vault-900 dark:text-vault-400">
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
    <div className="overflow-x-auto rounded-lg border border-vault-200 dark:border-vault-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-vault-200 bg-vault-50 dark:border-vault-700 dark:bg-vault-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-vault-600 dark:text-vault-400',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-vault-100 dark:divide-vault-700">
          {data.map((row) => (
            <tr
              key={String(row[keyField])}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'bg-white transition-colors dark:bg-vault-900',
                onRowClick && 'cursor-pointer hover:bg-vault-50 dark:hover:bg-vault-800'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-vault-800 dark:text-vault-200', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}