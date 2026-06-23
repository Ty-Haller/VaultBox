import { useMemo, useState } from 'react'
import {
  DATE_RANGE_PRESET_LABELS,
  resolveDateRange,
  type DateRange,
  type DateRangePreset,
} from '../../lib/dateRange'
import { inputClass } from '../ui/FormField'

interface DateRangeFilterProps {
  preset: DateRangePreset
  onPresetChange: (preset: DateRangePreset) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
}

export function useDateRangeState(initialPreset: DateRangePreset = 'ytd') {
  const [preset, setPreset] = useState(initialPreset)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const range = useMemo(
    () => resolveDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  )
  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range }
}

export function DateRangeFilter({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: DateRangeFilterProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(DATE_RANGE_PRESET_LABELS) as DateRangePreset[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onPresetChange(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === key
                ? 'bg-gold-500 text-white'
                : 'border border-vault-200 bg-white text-vault-600 hover:bg-vault-50'
            }`}
          >
            {DATE_RANGE_PRESET_LABELS[key]}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-vault-600">
            From
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
            />
          </label>
          <label className="text-sm text-vault-600">
            To
            <input
              type="date"
              className={`${inputClass} mt-1`}
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
            />
          </label>
        </div>
      )}
    </>
  )
}

export function formatRangeLabel(range: DateRange): string {
  if (range.from && range.to) return `${range.from} to ${range.to}`
  if (range.from) return `From ${range.from}`
  if (range.to) return `Through ${range.to}`
  return 'All time'
}