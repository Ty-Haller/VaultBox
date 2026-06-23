import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PriceHistoryPoint } from '../../types'
import { formatCurrency } from '../../lib/utils'
import type { PriceChartRange } from '../../lib/priceRange'

interface PriceChartProps {
  points: PriceHistoryPoint[]
  range: PriceChartRange
  color?: string
  forex?: boolean
}

function formatAxisValue(value: number, forex: boolean): string {
  if (forex) return value.toFixed(4)
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `$${(value / 1_000).toFixed(0)}k`
  if (value >= 100) return `$${value.toFixed(0)}`
  return `$${value.toFixed(2)}`
}

function formatTooltipValue(value: number, forex: boolean): string {
  return forex ? value.toFixed(4) : formatCurrency(value)
}

function formatLabel(timestamp: string, range: PriceChartRange): string {
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return timestamp
  if (range === '1d') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (range === '7d') {
    return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PriceChart({ points, range, color = '#d4a017', forex = false }: PriceChartProps) {
  const chartData = points.map((p) => ({
    ...p,
    label: formatLabel(p.timestamp, range),
  }))

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-vault-200 dark:stroke-vault-700" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            className="fill-vault-500 dark:fill-vault-400"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-vault-500 dark:fill-vault-400"
            tickFormatter={(v) => formatAxisValue(Number(v), forex)}
            domain={['auto', 'auto']}
            width={forex ? 56 : 48}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-vault-900, #111b24)',
              border: '1px solid var(--color-vault-600, #2f4258)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--color-vault-100, #e8eef3)',
            }}
            formatter={(value) => [formatTooltipValue(Number(value), forex), 'Price']}
            labelFormatter={(label) => String(label)}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            fill="url(#priceGrad)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}