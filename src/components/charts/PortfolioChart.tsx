import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PortfolioSnapshot } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { Card, CardHeader } from '../ui/Card'

interface PortfolioChartProps {
  data: PortfolioSnapshot[]
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  }))

  return (
    <Card>
      <CardHeader
        title="Portfolio Value"
        subtitle="Spot value vs acquisition cost over time"
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="spotGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4a017" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#d4a017" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5a7a96" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#5a7a96" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eef3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5a7a96' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#5a7a96' }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e8eef3',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === 'totalValue' ? 'Spot Value' : 'Cost Basis',
              ]}
            />
            <Area
              type="monotone"
              dataKey="totalCost"
              stroke="#5a7a96"
              fill="url(#costGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="totalValue"
              stroke="#d4a017"
              fill="url(#spotGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-vault-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-gold-500" /> Spot Value
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-vault-400" /> Cost Basis
        </span>
      </div>
    </Card>
  )
}