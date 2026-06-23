export type DateRangePreset = 'ytd' | 'last30' | 'last90' | 'all' | 'custom'

export interface DateRange {
  from: string | null
  to: string | null
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1)
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export function resolveDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): DateRange {
  const today = toDateString(new Date())
  switch (preset) {
    case 'ytd':
      return { from: toDateString(startOfYear(new Date())), to: today }
    case 'last30':
      return { from: toDateString(daysAgo(30)), to: today }
    case 'last90':
      return { from: toDateString(daysAgo(90)), to: today }
    case 'custom':
      return {
        from: customFrom || null,
        to: customTo || null,
      }
    case 'all':
    default:
      return { from: null, to: null }
  }
}

export function dateInRange(
  date: string | undefined | null,
  range: DateRange
): boolean {
  if (!date) return false
  if (range.from && date < range.from) return false
  if (range.to && date > range.to) return false
  return true
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  ytd: 'Year to date',
  last30: 'Last 30 days',
  last90: 'Last 90 days',
  all: 'All time',
  custom: 'Custom',
}