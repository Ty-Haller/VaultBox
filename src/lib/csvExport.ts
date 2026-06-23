export interface CsvColumn<T> {
  header: string
  getValue: (row: T) => string | number | null | undefined
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',')
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(col.getValue(row))).join(',')
  )
  return [header, ...lines].join('\r\n')
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

interface CsvSourceColumn<T> {
  header: string
  getCsvValue?: (row: T) => string
  getFilterValue?: (row: T) => string
}

export function exportTableCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvSourceColumn<T>[]
): void {
  const csvColumns: CsvColumn<T>[] = columns.map((col) => ({
    header: col.header,
    getValue: (row) => col.getCsvValue?.(row) ?? col.getFilterValue?.(row) ?? '',
  }))
  downloadCsv(filename, buildCsv(rows, csvColumns))
}