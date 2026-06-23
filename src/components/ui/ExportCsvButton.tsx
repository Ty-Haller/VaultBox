import { FileSpreadsheet } from 'lucide-react'

interface ExportCsvButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function ExportCsvButton({ onClick, disabled, className }: ExportCsvButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-md border border-vault-200 bg-white px-3 py-1.5 text-sm font-medium text-vault-700 hover:bg-vault-50 disabled:cursor-not-allowed disabled:opacity-50'
      }
    >
      <FileSpreadsheet className="h-4 w-4" />
      Export to CSV
    </button>
  )
}